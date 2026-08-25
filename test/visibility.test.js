// Parameter visibility, asserted through n8n's OWN displayParameter, so the
// expectations match what the editor actually does rather than what the schema
// merely declares.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { NodeHelpers } = require('n8n-workflow');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const description = new Gamma().description;
const additional = description.properties.find((p) => p.name === 'additionalOptions');
const numCards = additional.options.find((o) => o.name === 'numCards');
const dimensions = additional.options.filter((o) => /^cardDimensions/.test(o.name));
const node = { name: 'Gamma', type: 'gamma', typeVersion: 1, position: [0, 0], parameters: {} };

const visible = (prop, params) =>
	NodeHelpers.displayParameter(params.additionalOptions ?? {}, prop, node, description, params);

const params = (format, cardSplit) => ({
	resource: 'generation',
	operation: 'create',
	format,
	additionalOptions: cardSplit ? { cardSplit } : {},
});

// Straight from Gamma's Warnings reference: the API overrides anything else.
const VALID_DIMENSIONS = {
	presentation: ['16x9', '4x3', 'fluid'],
	document: ['pageless', 'letter', 'a4', 'fluid'],
	social: ['1x1', '4x5', '9x16'],
	webpage: ['fluid'],
};
const PARAM_FOR_FORMAT = {
	presentation: 'cardDimensionsPresentation',
	document: 'cardDimensionsDocument',
	social: 'cardDimensionsSocial',
	webpage: 'cardDimensionsWebpage',
};

describe('Number of Cards visibility', () => {
	it('is shown when Card Split is auto', () => {
		assert.strictEqual(visible(numCards, params('presentation', 'auto')), true);
	});

	it('is HIDDEN when Card Split is inputTextBreaks', () => {
		// Gamma ignores numCards in that mode, so showing it implies a control
		// that does nothing. This was the reported customer confusion.
		assert.strictEqual(visible(numCards, params('presentation', 'inputTextBreaks')), false);
	});

	it('is shown when Card Split is unset (the default is auto)', () => {
		assert.strictEqual(visible(numCards, params('presentation', undefined)), true);
	});
});

describe('Card Dimensions per format', () => {
	it('declares one parameter per format', () => {
		assert.strictEqual(dimensions.length, 4);
	});

	for (const [format, expected] of Object.entries(PARAM_FOR_FORMAT)) {
		it(`format=${format} shows only ${expected}`, () => {
			const shown = dimensions.filter((d) => visible(d, params(format))).map((d) => d.name);
			assert.deepStrictEqual(shown, [expected]);
		});

		it(`format=${format} offers only ratios the API accepts`, () => {
			const offered = dimensions.find((d) => d.name === PARAM_FOR_FORMAT[format])
				.options.map((o) => o.value).sort();
			assert.deepStrictEqual(offered, [...VALID_DIMENSIONS[format]].sort());
		});
	}
});
