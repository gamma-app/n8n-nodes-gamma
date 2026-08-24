// Exercises every routing.send.preSend hook in the built node. Run with `npm test`.
//
// Guards two things that are easy to get wrong and invisible until a user hits them:
//
// 1. Parameter paths. n8n invokes preSend with the NODE-level context, and
//    getNodeParameter does a lodash get() on node.parameters. So a hook on a
//    collection child must ask for the full path ('additionalOptions.tone'), not
//    the bare name. The mock below throws on a bare nested name, exactly as n8n
//    does -- 20 of 21 hooks were broken this way before this test existed.
// 2. Body composition. Hooks that write into the same nested object
//    (textOptions, imageOptions, sharingOptions...) must merge, not clobber.
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const node = new Gamma();

// Parameters that really do live at the top level of node.parameters.
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

// Collect every preSend with the parameter it hangs off.
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

console.log(`found ${hooks.length} preSend hooks\n`);

const ctx = {
	getNodeParameter(name) {
		// Mimic n8n: getNodeParameter does a lodash get() on node.parameters and
		// throws when the path misses. Collection children must be addressed by
		// their full path (e.g. 'additionalOptions.tone'), so a bare name here is
		// a real bug, not a harness gap.
		const parts = name.split('.');
		const leaf = parts[parts.length - 1];
		if (parts.length === 1 && !TOP_LEVEL.has(leaf)) {
			throw new Error(`Could not get parameter "${name}" (bare name for a nested param)`);
		}
		if (!(leaf in VALUES)) throw new Error(`Could not get parameter "${name}"`);
		return VALUES[leaf];
	},
	getNode: () => ({ name: 'Gamma', type: 'gamma' }),
};

// 1. Each hook in isolation must not throw and must return requestOptions.
let failures = 0;
for (const h of hooks) {
	const ro = { body: {}, qs: {} };
	try {
		const out = h.fn.call(ctx, ro);
		const settled = out instanceof Promise ? null : out;
		if (settled === null) continue; // handled in the async pass below
	} catch (e) {
		console.log(`  FAIL (sync) ${h.path}: ${e.message}`);
		failures++;
	}
}

(async () => {
	for (const h of hooks) {
		const ro = { body: {}, qs: {} };
		try {
			const out = await h.fn.call(ctx, ro);
			assert.ok(out && typeof out === 'object', 'must return requestOptions');
			assert.strictEqual(out, ro, 'must return the same requestOptions object');
		} catch (e) {
			console.log(`  FAIL ${h.path}: ${e.message}`);
			failures++;
		}
	}
	console.log(`isolation pass: ${hooks.length - failures} ok, ${failures} failed\n`);

	// 2. Composition: run ALL hooks in sequence against one requestOptions and
	//    check nothing clobbered anything else. This is what the spread rewrite
	//    could have broken.
	const ro = { body: {}, qs: {} };
	for (const h of hooks) await h.fn.call(ctx, ro);
	console.log('composed body:');
	console.log(JSON.stringify(ro.body, null, 2));
	console.log('composed qs:', JSON.stringify(ro.qs));

	const b = ro.body;
	const checks = [
		['textOptions keeps all four writers', () =>
			assert.deepStrictEqual(Object.keys(b.textOptions || {}).sort(), ['amount', 'audience', 'language', 'tone'])],
		['imageOptions keeps all three writers', () =>
			assert.deepStrictEqual(Object.keys(b.imageOptions || {}).sort(), ['model', 'source', 'style'])],
		['imageOptions.model came from the imageModel hook', () =>
			assert.strictEqual(b.imageOptions.model, 'flux-1-pro')],
		['cardOptions keeps both writers', () =>
			assert.deepStrictEqual(Object.keys(b.cardOptions || {}).sort(), ['dimensions', 'headerFooter'])],
		['dimensions come from one of the per-format hooks', () => {
			// The four Card Dimensions parameters are mutually exclusive via
			// displayOptions on /format, so composing every hook at once lets the
			// last one win. Only assert it is one of the valid values.
			assert.ok(['16x9', 'a4', '1x1', 'fluid'].includes(b.cardOptions.dimensions),
				`dimensions was ${b.cardOptions.dimensions}`);
		}],
		['sharingOptions keeps all writers', () =>
			assert.deepStrictEqual(Object.keys(b.sharingOptions || {}).sort(),
				['emailOptions', 'enableSearchEngineIndexing', 'externalAccess', 'workspaceAccess'])],
		['nested emailOptions keeps both writers', () =>
			assert.deepStrictEqual(Object.keys(b.sharingOptions?.emailOptions || {}).sort(), ['access', 'recipients'])],
		['headerFooter parsed to an object', () =>
			assert.deepStrictEqual(b.cardOptions.headerFooter, { topRight: { type: 'cardNumber' } })],
		['folderIds sent as a one-element array', () =>
			assert.deepStrictEqual(b.folderIds, ['fold_a'])],
		['recipients split and trimmed', () =>
			assert.deepStrictEqual(b.sharingOptions.emailOptions.recipients, ['a@example.com', 'b@example.com'])],
		['top-level scalars survive', () => {
			// themeId is written by two mutually-exclusive hooks (generation vs
			// template), gated by displayOptions, so composing every hook at once
			// lets the second win. Only assert it is set by one of them.
			assert.ok(['theme_abc', 'theme_tpl'].includes(b.themeId), `themeId was ${b.themeId}`);
			assert.strictEqual(b.additionalInstructions, 'be concise');
			assert.strictEqual(b.exportAs, 'pdf');
		}],
		['language honours the en-is-default skip', () => {
			const langHook = hooks.find((h) => h.name === 'language');
			const ro = { body: {} };
			langHook.fn.call({ ...ctx, getNodeParameter: () => 'en' }, ro);
			assert.deepStrictEqual(ro.body, {}, 'en should write nothing');
		}],
	];
	let bad = 0;
	console.log();
	for (const [label, check] of checks) {
		try { check(); console.log(`  ok    ${label}`); }
		catch (e) { bad++; console.log(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`); }
	}

	// 3. numCards must not be sent when Gamma would ignore it.
	console.log();
	const numCardsHook = hooks.find((h) => h.name === 'numCards');
	for (const [split, expected] of [['auto', 10], ['inputTextBreaks', undefined], [undefined, 10]]) {
		const ro = { body: {} };
		const ctx2 = {
			...ctx,
			getNodeParameter: (name, fallback) => {
				if (name === 'additionalOptions.cardSplit') return split ?? fallback;
				return ctx.getNodeParameter(name);
			},
		};
		await numCardsHook.fn.call(ctx2, ro);
		const got = ro.body.numCards;
		const ok = got === expected;
		if (!ok) bad++;
		console.log(`  ${ok ? 'ok   ' : 'FAIL '} cardSplit=${String(split)} -> numCards ${String(got)} (expected ${String(expected)})`);
	}

	// 4. More than one folder is a user error, not a silent truncation.
	const folderHook = hooks.find((h) => h.name === 'folderIds');
	try {
		await folderHook.fn.call({ ...ctx, getNodeParameter: () => 'fold_a, fold_b' }, { body: {} });
		console.log('  FAIL  two folder IDs did not throw');
		bad++;
	} catch (e) {
		const ok = e.constructor.name === 'NodeOperationError';
		console.log(`  ${ok ? 'ok   ' : 'FAIL '} two folder IDs throw ${e.constructor.name}`);
		if (!ok) bad++;
	}

	// 5. Invalid JSON must raise NodeOperationError, not a bare Error.
	console.log();
	const hf = hooks.find((h) => h.name === 'headerFooter');
	try {
		await hf.fn.call({ ...ctx, getNodeParameter: () => 'not json' }, { body: {} });
		console.log('  FAIL  invalid headerFooter JSON did not throw');
		bad++;
	} catch (e) {
		const ok = e.constructor.name === 'NodeOperationError';
		console.log(`  ${ok ? 'ok   ' : 'FAIL '} invalid JSON throws ${e.constructor.name}: ${e.message}`);
		if (!ok) bad++;
	}

	console.log(`\n${failures + bad === 0 ? 'ALL PASS' : `${failures + bad} FAILURES`}`);
	process.exit(failures + bad === 0 ? 0 : 1);
})();
