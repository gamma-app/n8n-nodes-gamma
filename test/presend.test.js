// preSend hooks: parameter paths and request-body composition.
//
// Guards two things that are easy to get wrong and invisible until a user hits them:
//
//  1. Parameter paths. n8n invokes preSend with the NODE-level context, and
//     getNodeParameter does a lodash get() on node.parameters. A hook on a
//     collection child must therefore ask for the full path
//     ('additionalOptions.tone'), not the bare name. The mock below throws on a
//     bare nested name exactly as n8n does -- 20 of 21 hooks were broken this
//     way before these tests existed.
//  2. Body composition. Hooks writing into the same nested object must merge,
//     not clobber.
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const node = new Gamma();

const TOP_LEVEL = new Set(['resource', 'operation', 'templateThemeId', 'generationId', 'inputText']);

// Canned values per parameter name.
const VALUES = {
	themeId: 'theme_abc', additionalInstructions: 'be concise', textAmount: 'detailed',
	tone: 'professional', audience: 'executives', language: 'fr', imageSource: 'unsplash',
	aiImageModel: 'flux-1-pro', imageStyle: 'photorealistic', cardDimensions: '16:9',
	folderIds: 'fold_a', workspaceAccess: 'view', externalAccess: 'comment',
	enableSearchEngineIndexing: true, headerFooter: '{"topRight":{"type":"cardNumber"}}',
	emailRecipients: 'a@example.com, b@example.com', emailAccess: 'view',
	exportAs: 'pdf', numCards: 10, cardSplit: 'auto', query: 'marketing', limit: 50,
	imageModel: 'flux-1-pro', templateThemeId: 'theme_tpl', folderQuery: 'marketing',
	cardDimensionsPresentation: '16x9', cardDimensionsDocument: 'a4',
	cardDimensionsSocial: '1x1', cardDimensionsWebpage: 'fluid',
};


/** Every routing.send.preSend in the node, with the parameter it hangs off. */
function collectHooks() {
	const hooks = [];
	(function walk(props, path) {
		for (const p of props || []) {
			const here = [...path, p.name];
			for (const fn of p.routing?.send?.preSend || []) {
				hooks.push({ name: p.name, path: here.join('.'), fn });
			}
			if (Array.isArray(p.options)) walk(p.options.filter((o) => o && o.name && o.type), here);
		}
	})(node.description.properties, []);
	return hooks;
}

const hooks = collectHooks();

function context(overrides = {}) {
	return {
		getNodeParameter(name, fallback) {
			const parts = name.split('.');
			const leaf = parts[parts.length - 1];
			if (parts.length === 1 && !TOP_LEVEL.has(leaf)) {
				throw new Error(`Could not get parameter "${name}" (bare name for a nested param)`);
			}
			if (!(leaf in VALUES)) {
				if (fallback !== undefined) return fallback;
				throw new Error(`Could not get parameter "${name}"`);
			}
			return VALUES[leaf];
		},
		getNode: () => ({ name: 'Gamma', type: 'gamma' }),
		...overrides,
	};
}

describe('preSend hooks', () => {
	it('finds every hook in the node', () => {
		assert.ok(hooks.length >= 20, `expected 20+ hooks, found ${hooks.length}`);
	});

	describe('each hook runs in isolation', () => {
		for (const h of hooks) {
			it(`${h.path} resolves its parameter and returns requestOptions`, async () => {
				const ro = { body: {}, qs: {} };
				const out = await h.fn.call(context(), ro);
				assert.strictEqual(out, ro, 'must return the same requestOptions object');
			});
		}
	});

	describe('composing every hook into one request body', () => {
		let body, qs;
		before(async () => {
			const ro = { body: {}, qs: {} };
			for (const h of hooks) await h.fn.call(context(), ro);
			body = ro.body;
			qs = ro.qs;
		});

		it('textOptions keeps all four writers', () => {
			assert.deepStrictEqual(Object.keys(body.textOptions).sort(),
				['amount', 'audience', 'language', 'tone']);
		});
		it('imageOptions keeps all three writers', () => {
			assert.deepStrictEqual(Object.keys(body.imageOptions).sort(), ['model', 'source', 'style']);
			assert.strictEqual(body.imageOptions.model, 'flux-1-pro');
		});
		it('cardOptions keeps both writers', () => {
			assert.deepStrictEqual(Object.keys(body.cardOptions).sort(), ['dimensions', 'headerFooter']);
		});
		it('offers a dimension value from one of the per-format hooks', () => {
			// The four Card Dimensions parameters are mutually exclusive via
			// displayOptions on /format, so composing all of them lets the last win.
			assert.ok(['16x9', 'a4', '1x1', 'fluid'].includes(body.cardOptions.dimensions));
		});
		it('sharingOptions keeps all writers, including the nested emailOptions', () => {
			assert.deepStrictEqual(Object.keys(body.sharingOptions).sort(),
				['emailOptions', 'enableSearchEngineIndexing', 'externalAccess', 'workspaceAccess']);
			assert.deepStrictEqual(Object.keys(body.sharingOptions.emailOptions).sort(),
				['access', 'recipients']);
		});
		it('parses headerFooter JSON into an object', () => {
			assert.deepStrictEqual(body.cardOptions.headerFooter, { topRight: { type: 'cardNumber' } });
		});
		it('splits and trims list values', () => {
			assert.deepStrictEqual(body.folderIds, ['fold_a']);
			assert.deepStrictEqual(body.sharingOptions.emailOptions.recipients,
				['a@example.com', 'b@example.com']);
		});
		it('keeps top-level scalars', () => {
			assert.strictEqual(body.additionalInstructions, 'be concise');
			assert.strictEqual(body.exportAs, 'pdf');
			// themeId is written by two mutually-exclusive hooks (generation vs template).
			assert.ok(['theme_abc', 'theme_tpl'].includes(body.themeId));
		});
		it('maps search to the query string', () => {
			assert.strictEqual(qs.query, 'marketing');
		});
	});

	describe('numCards is only sent when Gamma would honour it', () => {
		const hook = () => hooks.find((h) => h.name === 'numCards');
		const run = async (cardSplit) => {
			const ro = { body: {} };
			await hook().fn.call(context({
				getNodeParameter(name, fallback) {
					if (name === 'additionalOptions.cardSplit') return cardSplit ?? fallback;
					return context().getNodeParameter(name, fallback);
				},
			}), ro);
			return ro.body.numCards;
		};
		it('sends it for cardSplit=auto', async () => assert.strictEqual(await run('auto'), 10));
		it('omits it for cardSplit=inputTextBreaks', async () =>
			assert.strictEqual(await run('inputTextBreaks'), undefined));
		it('sends it when Card Split is unset', async () => assert.strictEqual(await run(undefined), 10));
	});

	describe('user errors raise NodeOperationError, not bare Error', () => {
		it('rejects more than one folder', async () => {
			const hook = hooks.find((h) => h.name === 'folderIds');
			await assert.rejects(
				() => hook.fn.call(context({ getNodeParameter: () => 'fold_a, fold_b' }), { body: {} }),
				(e) => e.constructor.name === 'NodeOperationError',
			);
		});
		it('rejects invalid Header/Footer JSON', async () => {
			const hook = hooks.find((h) => h.name === 'headerFooter');
			await assert.rejects(
				() => hook.fn.call(context({ getNodeParameter: () => 'not json' }), { body: {} }),
				(e) => e.constructor.name === 'NodeOperationError',
			);
		});
	});

	it('skips language=en, which is the API default', async () => {
		const hook = hooks.find((h) => h.name === 'language');
		const ro = { body: {} };
		await hook.fn.call(context({ getNodeParameter: () => 'en' }), ro);
		assert.deepStrictEqual(ro.body, {});
	});
});
