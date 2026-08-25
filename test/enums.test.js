// Unit tests for the enum generator's parsing logic, using fixtures so they run
// offline. The generator itself only does network work when run directly.
const { describe, it, before } = require('node:test');
const assert = require('node:assert');

let gen;
before(async () => { gen = await import('../scripts/sync-api-enums.mjs'); });

describe('extractSpec', () => {
	it('pulls a balanced OpenAPI block out of surrounding prose', () => {
		const md = 'intro text\n{"openapi":"3.0.0","components":{"schemas":{"A":{"enum":["x"]}}}}\ntrailing';
		assert.deepStrictEqual(gen.extractSpec(md).components.schemas.A.enum, ['x']);
	});

	it('is not fooled by braces inside strings', () => {
		const md = '{"openapi":"3.0.0","note":"a } brace and a { brace","ok":true}';
		assert.strictEqual(gen.extractSpec(md).ok, true);
	});

	it('is not fooled by an escaped quote before a brace', () => {
		const md = '{"openapi":"3.0.0","note":"quote \\" then }","ok":true}';
		assert.strictEqual(gen.extractSpec(md).ok, true);
	});

	it('throws when there is no spec block', () => {
		assert.throws(() => gen.extractSpec('no spec here'), /no OpenAPI block/);
	});

	it('throws on an unbalanced block rather than returning junk', () => {
		assert.throws(() => gen.extractSpec('{"openapi":"3.0.0","a":{'), /unbalanced/);
	});
});

describe('tableRows', () => {
	it('parses rows and drops the separator line', () => {
		const md = [
			'| Model Name | String | Credits/Image |',
			'| ---------- | ------ | ------------- |',
			'| Flux 1 Pro | `flux-1-pro` | 8 |',
			'| Dall-E 3   | `dall-e-3`   | 33 |',
		].join('\n');
		const rows = gen.tableRows(md);
		assert.deepStrictEqual(rows[rows.length - 2], ['Flux 1 Pro', '`flux-1-pro`', '8']);
		assert.deepStrictEqual(rows[rows.length - 1], ['Dall-E 3', '`dall-e-3`', '33']);
		assert.ok(!rows.some((r) => /^-+$/.test(r[1])), 'separator row leaked through');
	});

	it('ignores non-table prose', () => {
		assert.deepStrictEqual(gen.tableRows('just a paragraph\nand another'), []);
	});
});

describe('unbacktick', () => {
	it('strips backticks and trims', () => {
		assert.strictEqual(gen.unbacktick(' `flux-1-pro` '), 'flux-1-pro');
	});
});

describe('byName', () => {
	it('sorts the way n8n\'s linter expects (localeCompare, not ASCII)', () => {
		// ASCII would put "16:9" before "1:1"; the linter wants the opposite.
		const sorted = [{ name: '16:9 (Widescreen)' }, { name: '1:1 (Square)' }].sort(gen.byName);
		assert.deepStrictEqual(sorted.map((o) => o.name), ['1:1 (Square)', '16:9 (Widescreen)']);
	});
});

describe('generated apiEnums.ts', () => {
	let enums;
	before(() => { enums = require('../dist/nodes/Gamma/apiEnums.js'); });

	it('offers image models sorted by name', () => {
		const names = enums.IMAGE_MODEL_OPTIONS.map((o) => o.name);
		// "Auto" is pinned first as the empty-value default; the rest are sorted.
		assert.strictEqual(names[0], 'Auto (Let Gamma Choose)');
		assert.deepStrictEqual(names.slice(1), [...names.slice(1)].sort((a, b) => a.localeCompare(b)));
	});

	it('offers languages sorted by name', () => {
		const names = enums.LANGUAGE_OPTIONS.map((o) => o.name);
		assert.deepStrictEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
	});

	it('excludes video-only models from the image model list', () => {
		const offered = new Set(enums.IMAGE_MODEL_OPTIONS.map((o) => o.value));
		for (const v of enums.UNDOCUMENTED_MODEL_VALUES) {
			assert.ok(!offered.has(v), `${v} is a video model and should not be offered`);
		}
	});

	it('keeps the interface English-only, as n8n verification requires', () => {
		const nonAscii = [...enums.LANGUAGE_OPTIONS, ...enums.IMAGE_MODEL_OPTIONS]
			.filter((o) => /[^\x20-\x7E]/.test(o.name));
		assert.deepStrictEqual(nonAscii.map((o) => o.name), []);
	});

	it('offers only dimensions the API accepts per format', () => {
		assert.deepStrictEqual(
			Object.fromEntries(Object.entries(enums.CARD_DIMENSION_OPTIONS)
				.map(([f, o]) => [f, o.map((x) => x.value).sort()])),
			{
				presentation: ['16x9', '4x3', 'fluid'],
				document: ['a4', 'fluid', 'letter', 'pageless'],
				social: ['1x1', '4x5', '9x16'],
				webpage: ['fluid'],
			});
	});

	it('does not offer values the API rejects', () => {
		assert.ok(!enums.IMAGE_SOURCE_VALUES.includes('unsplash'));
		assert.ok(enums.IMAGE_SOURCE_VALUES.includes('pexels'));
		assert.deepStrictEqual([...enums.EXPORT_AS_VALUES], ['pdf', 'png', 'pptx']);
	});
});
