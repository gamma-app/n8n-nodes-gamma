// Both credentials, and the parameters that pick between them.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const { GammaApi } = require('../dist/credentials/GammaApi.credentials.js');
const { GammaOAuth2Api } = require('../dist/credentials/GammaOAuth2Api.credentials.js');
const pkg = require('../package.json');

const description = new Gamma().description;
const prop = (name) => description.properties.find((p) => p.name === name);

describe('authentication selector', () => {
	it('offers API key and OAuth2, defaulting to API key', () => {
		const auth = prop('authentication');
		assert.ok(auth, 'no authentication parameter');
		assert.deepStrictEqual(auth.options.map((o) => o.value), ['apiKey', 'oAuth2']);
		assert.strictEqual(auth.default, 'apiKey');
	});

	it('requires exactly one credential per mode', () => {
		for (const [mode, name] of [['apiKey', 'gammaApi'], ['oAuth2', 'gammaOAuth2Api']]) {
			const match = description.credentials.filter(
				(c) => c.name === name && c.displayOptions?.show?.authentication?.includes(mode));
			assert.strictEqual(match.length, 1, `no credential wired to ${mode}`);
			assert.strictEqual(match[0].required, true);
		}
	});

	it('registers both credentials in package.json', () => {
		for (const c of ['GammaApi', 'GammaOAuth2Api']) {
			assert.ok(pkg.n8n.credentials.some((p) => p.includes(c)), `${c} not registered`);
		}
	});
});

describe('OAuth2 credential', () => {
	const cred = new GammaOAuth2Api();
	const field = (name) => cred.properties.find((p) => p.name === name);

	it('extends n8n\'s generic OAuth2 credential', () => {
		assert.deepStrictEqual(cred.extends, ['oAuth2Api']);
		assert.strictEqual(cred.name, 'gammaOAuth2Api');
	});

	it('points at Gamma\'s authorization server', () => {
		assert.strictEqual(field('authUrl').default, 'https://auth.gamma.app/oauth/authorize');
		assert.strictEqual(field('accessTokenUrl').default, 'https://auth.gamma.app/oauth/token');
		assert.strictEqual(field('grantType').default, 'authorizationCode');
	});

	it('sends the RFC 8707 resource indicator', () => {
		// Gamma's docs call omitting this "the most common integration mistake":
		// without it the token audience is wrong and every API call fails even
		// though the OAuth flow itself appears to succeed.
		assert.strictEqual(
			field('authQueryParameters').default,
			'resource=https://public-api.gamma.app');
	});

	it('offers only the scopes Gamma documents', () => {
		assert.deepStrictEqual(field('scope').options.map((o) => o.value), ['generate', 'gamma:read']);
		assert.strictEqual(field('scope').default, 'generate');
	});
});

describe('resource locators', () => {
	const additional = prop('additionalOptions');
	const locators = [
		['themeId', additional.options.find((o) => o.name === 'themeId'), 'searchThemes'],
		['folderIds', additional.options.find((o) => o.name === 'folderIds'), 'searchFolders'],
		['templateThemeId', prop('templateThemeId'), 'searchThemes'],
	];

	it('backs each picker with a listSearch method that exists', () => {
		const methods = new Gamma().methods.listSearch;
		for (const [, , method] of locators) {
			assert.strictEqual(typeof methods[method], 'function', `${method} not implemented`);
		}
	});

	for (const [name, param, method] of locators) {
		describe(name, () => {
			it('is a resourceLocator', () => {
				assert.ok(param, `${name} not found`);
				assert.strictEqual(param.type, 'resourceLocator');
			});

			it('defaults to the From List mode, as the UX guidelines require', () => {
				assert.strictEqual(param.default.mode, 'list');
				assert.strictEqual(param.modes[0].name, 'list');
			});

			it('offers a searchable list plus a raw ID escape hatch', () => {
				const list = param.modes.find((m) => m.name === 'list');
				assert.strictEqual(list.typeOptions.searchListMethod, method);
				assert.strictEqual(list.typeOptions.searchable, true);
				assert.ok(param.modes.some((m) => m.name === 'id'), 'no by-ID mode');
			});
		});
	}
});

describe('list operation limits', () => {
	// Gamma caps `limit` at 50 on both /themes and /folders; the node previously
	// allowed 200, which the API rejects.
	const collections = ['themeAdditionalFields', 'folderAdditionalFields'];

	for (const name of collections) {
		it(`${name}.limit is capped at the API's maximum of 50`, () => {
			const limit = prop(name).options.find((o) => o.name === 'limit');
			assert.strictEqual(limit.typeOptions.maxValue, 50);
			assert.strictEqual(limit.typeOptions.minValue, 1);
		});
	}
});

describe('action naming', () => {
	it('omits articles, per the n8n UX guidelines', () => {
		const actions = description.properties
			.filter((p) => p.name === 'operation')
			.flatMap((p) => p.options.map((o) => o.action))
			.filter(Boolean);
		const withArticles = actions.filter((a) => /\b(a|an|the)\b/i.test(a));
		assert.deepStrictEqual(withArticles, []);
	});
});

describe('listSearch mapping', () => {
	const methods = new Gamma().methods.listSearch;

	/** A minimal ILoadOptionsFunctions that records the request and replays a body. */
	function context(body, authentication = 'apiKey') {
		const calls = [];
		return {
			calls,
			getNodeParameter: (name, fallback) => (name === 'authentication' ? authentication : fallback),
			helpers: {
				httpRequestWithAuthentication: async function (credentialType, options) {
					calls.push({ credentialType, options });
					return body;
				},
			},
		};
	}

	const THEMES = {
		data: [
			{ id: 'th_1', name: 'Oasis', type: 'standard' },
			{ id: 'th_2', name: 'Brand Deck', type: 'custom' },
		],
		hasMore: true,
		nextCursor: 'cursor_abc',
	};

	it('maps API items to name/value pairs', async () => {
		const ctx = context(THEMES);
		const res = await methods.searchThemes.call(ctx);
		assert.deepStrictEqual(res.results.map((r) => [r.name, r.value]),
			[['Oasis', 'th_1'], ['Brand Deck', 'th_2']]);
	});

	it('labels standard vs custom themes', async () => {
		const res = await methods.searchThemes.call(context(THEMES));
		assert.deepStrictEqual(res.results.map((r) => r.description),
			['Standard theme', 'Custom workspace theme']);
	});

	it('passes the cursor through for paging', async () => {
		const res = await methods.searchThemes.call(context(THEMES));
		assert.strictEqual(res.paginationToken, 'cursor_abc');
	});

	it('stops paging when the API returns a null cursor', async () => {
		// n8n keeps requesting while paginationToken is set; the API signals the
		// end with null, which must become undefined or the picker loops.
		const res = await methods.searchThemes.call(
			context({ data: [], hasMore: false, nextCursor: null }));
		assert.strictEqual(res.paginationToken, undefined);
	});

	it('sends the search filter and cursor as query parameters', async () => {
		const ctx = context(THEMES);
		await methods.searchThemes.call(ctx, 'brand', 'cursor_xyz');
		const { options } = ctx.calls[0];
		assert.strictEqual(options.qs.query, 'brand');
		assert.strictEqual(options.qs.after, 'cursor_xyz');
		assert.strictEqual(options.qs.limit, 50, 'must not exceed the API maximum');
		assert.strictEqual(options.url, '/v1.0/themes');
	});

	it('omits query and cursor when not searching or paging', async () => {
		const ctx = context(THEMES);
		await methods.searchThemes.call(ctx);
		assert.deepStrictEqual(Object.keys(ctx.calls[0].options.qs), ['limit']);
	});

	it('uses the folders endpoint for the folder picker', async () => {
		const ctx = context({ data: [{ id: 'f_1', name: 'Marketing' }], nextCursor: null });
		const res = await methods.searchFolders.call(ctx);
		assert.strictEqual(ctx.calls[0].options.url, '/v1.0/folders');
		assert.deepStrictEqual(res.results, [{ name: 'Marketing', value: 'f_1', description: undefined }]);
	});

	it('authenticates with whichever credential the node is set to', async () => {
		for (const [mode, expected] of [['apiKey', 'gammaApi'], ['oAuth2', 'gammaOAuth2Api']]) {
			const ctx = context(THEMES, mode);
			await methods.searchThemes.call(ctx);
			assert.strictEqual(ctx.calls[0].credentialType, expected);
		}
	});

	it('survives a response with no data array', async () => {
		const res = await methods.searchFolders.call(context({}));
		assert.deepStrictEqual(res.results, []);
	});
});
