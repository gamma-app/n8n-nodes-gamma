// Multi-page generation. The API is explicit that a request supplies EITHER
// inputText OR a pages array, so this is a separate operation rather than an
// option on Create -- an ignored required field is the trap this avoids.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const properties = new Gamma().description.properties;
const prop = (name) => properties.find((p) => p.name === name);
const genOps = prop('operation').options ?? [];
const multiPage = properties
	.filter((p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('generation'))[0]
	.options.find((o) => o.value === 'createMultiPage');

const node = { name: 'Gamma', type: 'gamma' };
const ctx = (values) => ({
	getNodeParameter: (name, fallback) => (name in values ? values[name] : fallback),
	getNode: () => node,
});
const hookOf = (name) => prop(name).routing.send.preSend[0];

describe('Create Multi-Page operation', () => {
	it('exists and posts to the generations endpoint', () => {
		assert.ok(multiPage, 'no createMultiPage operation');
		assert.strictEqual(multiPage.routing.request.method, 'POST');
		assert.strictEqual(multiPage.routing.request.url, '/v1.0/generations');
	});

	it('does not ask for Input Text, which pages replaces', () => {
		// inputText is required on Create. Showing it here would promise something
		// the API ignores.
		assert.ok(!prop('inputText').displayOptions.show.operation.includes('createMultiPage'));
	});

	it('offers both a JSON array and hand-authored pages', () => {
		assert.deepStrictEqual(prop('pagesInputMode').options.map((o) => o.value), ['json', 'fields']);
		assert.strictEqual(prop('pagesInputMode').default, 'json');
		assert.deepStrictEqual(prop('pagesJson').displayOptions.show.pagesInputMode, ['json']);
		assert.deepStrictEqual(prop('pagesUi').displayOptions.show.pagesInputMode, ['fields']);
	});

	it('offers publish, which only applies to multi-page', () => {
		assert.deepStrictEqual(prop('publish').displayOptions.show.operation, ['createMultiPage']);
		assert.strictEqual(prop('publish').routing.request.body.publish, '={{ $value }}');
	});
});

describe('Options that pages overrides are hidden', () => {
	// Straight from the spec: pages takes precedence over inputText, textMode,
	// numCards, format, additionalInstructions, cardSplit, textOptions and
	// imageOptions. Offering them would be offering settings with no effect.
	const collection = prop('additionalOptions');
	const hidden = ['additionalInstructions', 'cardSplit', 'numCards', 'textAmount', 'tone',
		'audience', 'language', 'imageSource', 'imageModel', 'imageStyle'];
	const fileLevel = ['title', 'themeId', 'folderIds', 'exportAs', 'workspaceAccess',
		'externalAccess', 'emailRecipients', 'headerFooter'];

	it('shows the collection for both create operations', () => {
		assert.deepStrictEqual(collection.displayOptions.show.operation,
			['create', 'createMultiPage']);
	});

	for (const name of hidden) {
		it(`hides ${name}`, () => {
			const o = collection.options.find((x) => x.name === name);
			assert.ok(o, `${name} not found`);
			assert.ok(o.displayOptions?.hide?.['/operation']?.includes('createMultiPage'),
				`${name} is offered for multi-page but pages overrides it`);
		});
	}

	for (const name of fileLevel) {
		it(`keeps ${name}, which applies to the whole file`, () => {
			const o = collection.options.find((x) => x.name === name);
			assert.ok(o, `${name} not found`);
			assert.ok(!o.displayOptions?.hide?.['/operation']?.includes('createMultiPage'),
				`${name} is file-level and should stay available`);
		});
	}

	it('still hides numCards when splitting on text breaks', () => {
		// The two conditions are OR'd; adding the multi-page rule must not have
		// dropped the original one.
		const hide = collection.options.find((o) => o.name === 'numCards').displayOptions.hide;
		assert.ok(hide['/operation'].includes('createMultiPage'));
		assert.ok(hide['/additionalOptions.cardSplit'].includes('inputTextBreaks'));
	});
});

describe('Pages validation', () => {
	const json = hookOf('pagesJson');
	const ui = hookOf('pagesUi');

	it('accepts a JSON array and sends it as pages', async () => {
		const ro = { body: {} };
		await json.call(ctx({ pagesJson: '[{"inputText":"a"},{"inputText":"b","path":"b"}]' }), ro);
		assert.deepStrictEqual(ro.body.pages, [{ inputText: 'a' }, { inputText: 'b', path: 'b' }]);
	});

	it('accepts an already-parsed array, as an expression would supply', async () => {
		const ro = { body: {} };
		await json.call(ctx({ pagesJson: [{ inputText: 'a' }] }), ro);
		assert.deepStrictEqual(ro.body.pages, [{ inputText: 'a' }]);
	});

	const rejects = [
		['invalid JSON', '{not json', /not valid JSON/],
		['an object rather than an array', '{"inputText":"a"}', /must be an array/],
		['an empty array', '[]', /at least one page/],
		['a page with no inputText', '[{"title":"x"}]', /Page 1 has no Input Text/],
		['a non-object entry', '["just a string"]', /Page 1 is not an object/],
	];
	for (const [label, value, message] of rejects) {
		it(`rejects ${label}`, async () => {
			await assert.rejects(() => json.call(ctx({ pagesJson: value }), { body: {} }),
				(e) => e.constructor.name === 'NodeOperationError' && message.test(e.message));
		});
	}

	it('rejects more than the 50 pages the API accepts', async () => {
		const many = JSON.stringify(Array.from({ length: 51 }, () => ({ inputText: 'x' })));
		await assert.rejects(() => json.call(ctx({ pagesJson: many }), { body: {} }),
			(e) => /at most 50 pages/.test(e.message));
	});

	it('drops empty optional fields from hand-authored pages', async () => {
		const ro = { body: {} };
		await ui.call(ctx({ pagesUi: { page: [{ inputText: 'a', title: '', path: 'p' }] } }), ro);
		assert.deepStrictEqual(ro.body.pages, [{ inputText: 'a', path: 'p' }]);
	});

	it('applies the same validation to hand-authored pages', async () => {
		await assert.rejects(
			() => ui.call(ctx({ pagesUi: { page: [{ inputText: '', title: 'x' }] } }), { body: {} }),
			(e) => /has no Input Text/.test(e.message));
	});
});
