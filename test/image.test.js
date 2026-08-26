// The Image resource: standalone on-brand image generation.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const node = new Gamma();
const description = node.description;
const prop = (name) => description.properties.find(
	(p) => p.name === name && p.displayOptions?.show?.resource?.includes('image'));
const ops = prop('operation').options.filter((o) => o.value !== '__CUSTOM_API_CALL__');
const op = (v) => ops.find((o) => o.value === v);
const fields = prop('imageAdditionalFields').options;
const field = (n) => fields.find((f) => f.name === n);

describe('Image resource', () => {
	it('covers create, poll and archive', () => {
		assert.deepStrictEqual(ops.map((o) => o.value).sort(),
			['archiveMedia', 'create', 'getStatus']);
	});

	const routes = {
		create: ['POST', '/v1.0/images'],
		getStatus: ['GET', '/v1.0/images/{id}'],
		archiveMedia: ['POST', '/v1.0/images/media/{id}/archive'],
	};
	for (const [value, [method, path]] of Object.entries(routes)) {
		it(`${value} targets ${method} ${path}`, () => {
			const req = op(value).routing.request;
			assert.strictEqual(req.method, method);
			assert.strictEqual(req.url.replace(/^=/, '').replace(/\{\{[^}]*\}\}/g, '{id}'), path);
		});
	}

	it('requires a prompt, which the API mandates', () => {
		const p = prop('imagePrompt');
		assert.strictEqual(p.required, true);
		assert.strictEqual(p.routing.request.body.prompt, '={{ $value }}');
	});

	it('requires the IDs its polling and archive operations address', () => {
		assert.strictEqual(prop('imageGenerationId').required, true);
		assert.strictEqual(prop('savedMediaId').required, true);
	});

	it('names its collection distinctly from the Generation body key', () => {
		// `imageOptions` is what the Generation resource writes into the request
		// body; reusing it as a parameter name here would be needlessly confusing.
		assert.ok(prop('imageAdditionalFields'), 'no imageAdditionalFields collection');
		assert.strictEqual(prop('imageOptions'), undefined);
	});
});

describe('Image options match the API enums', () => {
	it('offers only the documented image types', () => {
		assert.deepStrictEqual(field('imageType').options.map((o) => o.value),
			['abstract', 'illustration', 'photo', 'scene']);
	});

	it('offers only the documented size presets', () => {
		assert.deepStrictEqual(field('sizePreset').options.map((o) => o.value),
			['banner', 'slide', 'social-portrait', 'social-square', 'story']);
	});

	it('reuses the Theme picker', () => {
		const theme = field('imageThemeId');
		assert.strictEqual(theme.type, 'resourceLocator');
		assert.strictEqual(theme.modes.find((m) => m.name === 'list').typeOptions.searchListMethod,
			'searchThemes');
	});

	it('warns that reference images override style and theme', () => {
		// The API returns curated_style_skipped_for_references and
		// theme_skipped_for_references warnings, which surprise people.
		assert.match(field('referenceImages').description, /skip a curated style/i);
	});
});

describe('Reference images', () => {
	const hook = field('referenceImages').routing.send.preSend[0];
	const ctx = (value) => ({
		getNodeParameter: () => value,
		getNode: () => ({ name: 'Gamma', type: 'gamma' }),
	});

	it('maps rows to the array shape the API expects', async () => {
		const ro = { body: {} };
		await hook.call(ctx({ image: [
			{ url: 'https://example.com/a.png', role: 'subject' },
			{ url: 'https://example.com/b.png', role: '' },
		] }), ro);
		assert.deepStrictEqual(ro.body.referenceImages, [
			{ url: 'https://example.com/a.png', role: 'subject' },
			{ url: 'https://example.com/b.png' },
		]);
	});

	it('sends nothing when no rows are added', async () => {
		const ro = { body: {} };
		await hook.call(ctx({}), ro);
		assert.deepStrictEqual(ro.body, {});
	});

	it('rejects a row with no URL rather than sending a broken array', async () => {
		await assert.rejects(
			() => hook.call(ctx({ image: [{ url: '', role: 'subject' }] }), { body: {} }),
			(e) => e.constructor.name === 'NodeOperationError');
	});
});
