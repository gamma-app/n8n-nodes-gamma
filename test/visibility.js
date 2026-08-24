// Checks parameter visibility using n8n's OWN displayParameter implementation,
// so the assertions match what the editor actually does. Run with `npm test`.
//
// Two rules matter enough to pin down:
//   * `Number of Cards` must disappear when Card Split is `inputTextBreaks`,
//     because Gamma ignores numCards in that mode and showing it implies a
//     control that does nothing.
//   * exactly one `Card Dimensions` parameter is visible per format, so an
//     aspect ratio the API would override is unpickable.
const assert = require('node:assert');
const { NodeHelpers } = require('n8n-workflow');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const description = new Gamma().description;
const additional = description.properties.find((p) => p.name === 'additionalOptions');
const numCards = additional.options.find((o) => o.name === 'numCards');
const dimensions = additional.options.filter((o) => /^cardDimensions/.test(o.name));
const node = { name: 'Gamma', type: 'gamma', typeVersion: 1, position: [0, 0], parameters: {} };

const visible = (prop, params, collection) =>
	NodeHelpers.displayParameter(params[collection] ?? {}, prop, node, description, params);

const params = (format, cardSplit) => ({
	resource: 'generation',
	operation: 'create',
	format,
	additionalOptions: cardSplit ? { cardSplit } : {},
});

let failures = 0;
const check = (label, fn) => {
	try { fn(); console.log(`  ok    ${label}`); }
	catch (e) { failures++; console.log(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`); }
};

assert.ok(numCards, 'numCards parameter not found');
assert.strictEqual(dimensions.length, 4, 'expected four per-format Card Dimensions parameters');

console.log('numCards visibility by Card Split:');
check('shown for cardSplit=auto', () =>
	assert.strictEqual(visible(numCards, params('presentation', 'auto'), 'additionalOptions'), true));
check('HIDDEN for cardSplit=inputTextBreaks', () =>
	assert.strictEqual(visible(numCards, params('presentation', 'inputTextBreaks'), 'additionalOptions'), false));
check('shown when Card Split is unset (defaults to auto)', () =>
	assert.strictEqual(visible(numCards, params('presentation', undefined), 'additionalOptions'), true));

console.log('\nCard Dimensions by format:');
const expected = {
	presentation: 'cardDimensionsPresentation',
	document: 'cardDimensionsDocument',
	social: 'cardDimensionsSocial',
	webpage: 'cardDimensionsWebpage',
};
for (const [format, want] of Object.entries(expected)) {
	check(`format=${format} shows only ${want}`, () => {
		const shown = dimensions.filter((d) => visible(d, params(format), 'additionalOptions')).map((d) => d.name);
		assert.deepStrictEqual(shown, [want]);
	});
}

// Every offered ratio must be one the API accepts for that format.
const VALID = {
	presentation: ['16x9', '4x3', 'fluid'],
	document: ['pageless', 'letter', 'a4', 'fluid'],
	social: ['1x1', '4x5', '9x16'],
	webpage: ['fluid'],
};
console.log('\nOffered ratios are valid for their format:');
for (const [format, name] of Object.entries(expected)) {
	check(`${format} offers only ${VALID[format].join('/')}`, () => {
		const offered = dimensions.find((d) => d.name === name).options.map((o) => o.value).sort();
		assert.deepStrictEqual(offered, [...VALID[format]].sort());
	});
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
