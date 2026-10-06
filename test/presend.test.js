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

const TOP_LEVEL = new Set(['resource', 'operation', 'templateThemeId', 'generationId', 'inputText',
	'pagesJson', 'pagesUi']);

// Canned values per parameter name.
const VALUES = {
	themeId: 'theme_abc', additionalInstructions: 'be concise', textAmount: 'detailed',
	tone: 'professional', audience: 'executives', language: 'fr', imageSource: 'pexels',
	imageStyle: 'photorealistic',
	folderIds: 'fold_a', workspaceAccess: 'view', externalAccess: 'comment',
	enableSearchEngineIndexing: true, headerFooter: '{"topRight":{"type":"cardNumber"}}',
	emailRecipients: 'a@example.com, b@example.com', emailAccess: 'view',
	exportAs: 'pdf', numCards: 10, cardSplit: 'auto', query: 'marketing', limit: 50,
	imageModel: 'flux-1-pro', templateThemeId: 'theme_tpl', folderQuery: 'marketing',
	cardDimensionsPresentation: '16x9', cardDimensionsDocument: 'a4',
	cardDimensionsSocial: '1x1', cardDimensionsWebpage: 'fluid',
	title: 'Q3 Results Overview',
	// Image resource
	imagePrompt: 'A cyclist on a coastal road at sunrise',
	imageType: 'photo', sizePreset: 'slide', imageThemeId: 'theme_img',
	imageGenerationId: 'imggen_abc', savedMediaId: 'media_abc',
	referenceImages: { image: [{ url: 'https://example.com/ref.png', role: 'subject' }] },
	// Multi-page
	pagesJson: '[{"inputText":"First page"},{"inputText":"Second page","path":"second"}]',
	pagesUi: { page: [{ inputText: 'From fields', title: '', path: 'p1' }] },
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
			// The Generation resource's image settings. Distinct from the Image
			// resource's own collection, which is `imageAdditionalFields`.
			assert.deepStrictEqual(Object.keys(body.imageOptions).sort(), ['model', 'source', 'style']);
			assert.strictEqual(body.imageOptions.model, 'flux-1-pro');
		});

		it('the Image resource writes its own top-level fields', () => {
			assert.strictEqual(body.type, 'photo');
			assert.strictEqual(body.sizePreset, 'slide');
			assert.deepStrictEqual(body.referenceImages,
				[{ url: 'https://example.com/ref.png', role: 'subject' }]);
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
			assert.strictEqual(body.title, 'Q3 Results Overview');
			assert.strictEqual(body.additionalInstructions, 'be concise');
			assert.strictEqual(body.exportAs, 'pdf');
			// themeId is written by three mutually-exclusive hooks: the Generation
			// additional option, the template override, and the Image resource.
			// Composing every hook at once lets the last one win, so only assert it
			// came from one of them.
			assert.ok(['theme_abc', 'theme_tpl', 'theme_img'].includes(body.themeId),
				`themeId was ${body.themeId}`);
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

	// What each hook writes when run alone on an empty request. Pins the exact
	// path and value, which the composition tests above only check by key.
	const WRITES = {
		'additionalOptions.additionalInstructions': { body: { additionalInstructions: 'be concise' } },
		'additionalOptions.imageModel': { body: { imageOptions: { model: 'flux-1-pro' } } },
		'additionalOptions.audience': { body: { textOptions: { audience: 'executives' } } },
		'additionalOptions.cardDimensionsPresentation': { body: { cardOptions: { dimensions: '16x9' } } },
		'additionalOptions.cardDimensionsDocument': { body: { cardOptions: { dimensions: 'a4' } } },
		'additionalOptions.cardDimensionsSocial': { body: { cardOptions: { dimensions: '1x1' } } },
		'additionalOptions.cardDimensionsWebpage': { body: { cardOptions: { dimensions: 'fluid' } } },
		'additionalOptions.emailAccess': { body: { sharingOptions: { emailOptions: { access: 'view' } } } },
		'additionalOptions.emailRecipients': {
			body: { sharingOptions: { emailOptions: { recipients: ['a@example.com', 'b@example.com'] } } },
		},
		'additionalOptions.enableSearchEngineIndexing': { body: { sharingOptions: { enableSearchEngineIndexing: true } } },
		'additionalOptions.exportAs': { body: { exportAs: 'pdf' } },
		'additionalOptions.externalAccess': { body: { sharingOptions: { externalAccess: 'comment' } } },
		'additionalOptions.folderIds': { body: { folderIds: ['fold_a'] } },
		'additionalOptions.headerFooter': { body: { cardOptions: { headerFooter: { topRight: { type: 'cardNumber' } } } } },
		'additionalOptions.imageSource': { body: { imageOptions: { source: 'pexels' } } },
		'additionalOptions.imageStyle': { body: { imageOptions: { style: 'photorealistic' } } },
		'additionalOptions.language': { body: { textOptions: { language: 'fr' } } },
		'additionalOptions.numCards': { body: { numCards: 10 } },
		'additionalOptions.textAmount': { body: { textOptions: { amount: 'detailed' } } },
		'additionalOptions.themeId': { body: { themeId: 'theme_abc' } },
		'additionalOptions.title': { body: { title: 'Q3 Results Overview' } },
		'additionalOptions.tone': { body: { textOptions: { tone: 'professional' } } },
		'additionalOptions.workspaceAccess': { body: { sharingOptions: { workspaceAccess: 'view' } } },
		pagesJson: { body: { pages: [{ inputText: 'First page' }, { inputText: 'Second page', path: 'second' }] } },
		pagesUi: { body: { pages: [{ inputText: 'From fields', path: 'p1' }] } },
		templateThemeId: { body: { themeId: 'theme_tpl' } },
		'imageAdditionalFields.referenceImages': {
			body: { referenceImages: [{ url: 'https://example.com/ref.png', role: 'subject' }] },
		},
		'imageAdditionalFields.sizePreset': { body: { sizePreset: 'slide' } },
		'imageAdditionalFields.imageThemeId': { body: { themeId: 'theme_img' } },
		'imageAdditionalFields.imageType': { body: { type: 'photo' } },
		'themeAdditionalFields.query': { qs: { query: 'marketing' } },
		'folderAdditionalFields.folderQuery': { qs: { query: 'marketing' } },
	};

	describe('each hook writes exactly its own field', () => {
		it('covers every hook', () => {
			assert.deepStrictEqual(hooks.map((h) => h.path).sort(), Object.keys(WRITES).sort());
		});
		for (const h of hooks) {
			it(h.path, async () => {
				const ro = {};
				await h.fn.call(context(), ro);
				assert.deepStrictEqual(ro, WRITES[h.path]);
			});
		}
	});

	describe('sends nothing for a value that would not change the result', () => {
		const silent = async (path, value, extra = {}) => {
			const ro = {};
			const h = hooks.find((x) => x.path === path);
			await h.fn.call(context({
				getNodeParameter: (name, fallback) =>
					name in extra ? extra[name] : name === path ? value : context().getNodeParameter(name, fallback),
			}), ro);
			assert.deepStrictEqual(ro, {});
		};
		// Pages are always required, so an empty value is an error, not a no-op.
		for (const h of hooks.filter((x) => !x.path.startsWith('pages'))) {
			it(`${h.path} = ''`, () => silent(h.path, ''));
		}
		it('language=en, the API default', () => silent('additionalOptions.language', 'en'));
		it('textAmount=medium, the API default', () => silent('additionalOptions.textAmount', 'medium'));
		it('imageSource=aiGenerated, the API default', () => silent('additionalOptions.imageSource', 'aiGenerated'));
		it('enableSearchEngineIndexing=false', () => silent('additionalOptions.enableSearchEngineIndexing', false));
		it('emailAccess with no recipients', () => silent('additionalOptions.emailAccess', 'edit',
			{ 'additionalOptions.emailRecipients': '' }));
	});
});
