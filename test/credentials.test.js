// Both credentials, and the parameters that pick between them.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const { GammaApi } = require('../dist/credentials/GammaApi.credentials.js');
const pkg = require('../package.json');

const description = new Gamma().description;
const prop = (name) => description.properties.find((p) => p.name === name);

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

describe('resource locator backward compatibility', () => {
	// Theme and Folder used to be plain string fields. n8n's extractValue returns
	// any value that is not a { mode, value } object unchanged
	// (packages/core/.../extract-value.ts), so a workflow saved before this change
	// still sends its stored ID. These assert the hooks cope with the legacy shape.
	const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
	const node = new Gamma();

	function hookFor(paramName) {
		let found;
		(function walk(props) {
			for (const p of props || []) {
				if (p.name === paramName && p.routing?.send?.preSend?.[0]) found = p.routing.send.preSend[0];
				if (Array.isArray(p.options)) walk(p.options.filter((o) => o && o.name && o.type));
			}
		})(node.description.properties);
		return found;
	}

	const ctx = (value) => ({
		getNodeParameter: () => value,
		getNode: () => ({ name: 'Gamma', type: 'gamma' }),
	});

	it('a legacy string themeId still reaches the request body', async () => {
		const ro = { body: {} };
		await hookFor('themeId').call(ctx('legacy_theme_id'), ro);
		assert.strictEqual(ro.body.themeId, 'legacy_theme_id');
	});

	it('a legacy string folder still reaches the request body', async () => {
		const ro = { body: {} };
		await hookFor('folderIds').call(ctx('legacy_folder_id'), ro);
		assert.deepStrictEqual(ro.body.folderIds, ['legacy_folder_id']);
	});

	it('an empty picker selection sends nothing at all', async () => {
		const ro = { body: {} };
		await hookFor('themeId').call(ctx(''), ro);
		assert.deepStrictEqual(ro.body, {}, 'an unset Theme must not send themeId');
	});
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
	function context(body) {
		const calls = [];
		return {
			calls,
			getNodeParameter: (_name, fallback) => fallback,
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

	it('authenticates with the Gamma API credential', async () => {
		const ctx = context(THEMES);
		await methods.searchThemes.call(ctx);
		assert.strictEqual(ctx.calls[0].credentialType, 'gammaApi');
	});

	it('survives a response with no data array', async () => {
		const res = await methods.searchFolders.call(context({}));
		assert.deepStrictEqual(res.results, []);
	});
});
