// The Gamma and Export resources: working with an existing Gamma.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const description = new Gamma().description;
const prop = (name, resource) => description.properties.find(
	(p) => p.name === name && (!resource || p.displayOptions?.show?.resource?.includes(resource)));

const gammaOps = prop('operation', 'gamma').options;
const op = (value) => gammaOps.find((o) => o.value === value);

describe('Gamma resource', () => {
	it('covers the documented lifecycle', () => {
		assert.deepStrictEqual(gammaOps.map((o) => o.value).sort(),
			['archive', 'delete', 'export', 'get']);
	});

	const expected = {
		get: ['GET', '/v1.0/gammas/{id}'],
		export: ['POST', '/v1.0/gammas/{id}/export'],
		archive: ['POST', '/v1.0/gammas/{id}/archive'],
		delete: ['DELETE', '/v1.0/gammas/{id}'],
	};

	for (const [value, [method, path]] of Object.entries(expected)) {
		it(`${value} targets ${method} ${path}`, () => {
			const req = op(value).routing.request;
			assert.strictEqual(req.method, method);
			assert.strictEqual(
				req.url.replace(/^=/, '').replace(/\{\{[^}]*\}\}/g, '{id}'), path);
		});
	}

	it('interpolates the same identifier parameter into every path', () => {
		for (const value of Object.keys(expected)) {
			assert.match(op(value).routing.request.url, /\$parameter\["gammaIdentifier"\]/);
		}
	});

	it('requires the Gamma ID', () => {
		const id = prop('gammaIdentifier', 'gamma');
		assert.strictEqual(id.required, true);
		assert.strictEqual(id.type, 'string');
	});

	it('warns that archive and delete reject a URL slug', () => {
		// A documented 403 cause: passing the gamma.app/docs/<id> slug where the
		// API file ID is required. Get and Export accept either; archive and
		// delete do not.
		const text = prop('gammaIdentifier', 'gamma').description;
		assert.match(text, /Archive and Delete do not/i);
		assert.match(text, /403/);
	});
});

describe('Export operation', () => {
	it('offers only the formats the API accepts', () => {
		const format = prop('exportFormat', 'gamma');
		assert.deepStrictEqual(format.options.map((o) => o.value), ['pdf', 'png', 'pptx']);
		assert.strictEqual(format.required, true);
	});

	it('sends the format in the request body', () => {
		assert.strictEqual(prop('exportFormat', 'gamma').routing.request.body.exportAs, '={{ $value }}');
	});

	it('only appears for the export operation', () => {
		assert.deepStrictEqual(prop('exportFormat', 'gamma').displayOptions.show.operation, ['export']);
	});
});

describe('Export resource', () => {
	it('polls the export status endpoint', () => {
		const ops = prop('operation', 'export').options;
		assert.deepStrictEqual(ops.map((o) => o.value), ['getStatus']);
		const req = ops[0].routing.request;
		assert.strictEqual(req.method, 'GET');
		assert.match(req.url, /\/v1\.0\/exports\/\{\{\$parameter\["exportId"\]\}\}/);
	});

	it('requires the export ID', () => {
		assert.strictEqual(prop('exportId', 'export').required, true);
	});
});

describe('Delete confirms deletion', () => {
	it('sets deleted: true, as the UX guidelines require', () => {
		// The API returns { status, gammaId, message }; n8n's guidelines ask a
		// delete to emit `deleted: true` so the next node has a clear signal.
		const [action] = op('delete').routing.output.postReceive;
		assert.strictEqual(action.type, 'setKeyValue');
		assert.strictEqual(action.properties.deleted, '={{ true }}');
		assert.match(action.properties.gammaId, /\$responseItem\.gammaId/);
	});
});

describe('Get uses Simplify', () => {
	// GET /gammas/{id} returns 11 fields, over the guideline's threshold of 10.
	const simplify = prop('simplify', 'gamma');

	it('exists, defaults on, and is worded exactly as the guidelines require', () => {
		assert.ok(simplify, 'no Simplify parameter');
		assert.strictEqual(simplify.type, 'boolean');
		assert.strictEqual(simplify.default, true);
		assert.strictEqual(simplify.description,
			'Whether to return a simplified version of the response instead of the raw data');
	});

	it('only applies to the get operation', () => {
		assert.deepStrictEqual(simplify.displayOptions.show.operation, ['get']);
	});

	it('reduces to at most 10 fields and flattens the nested author', () => {
		const [action] = simplify.routing.output.postReceive;
		const keys = Object.keys(action.properties);
		assert.ok(keys.length <= 10, `simplified output has ${keys.length} fields`);
		assert.ok(keys.includes('authorName'), 'nested author should be flattened');
		assert.ok(!keys.includes('author'), 'nested author should not survive as an object');
	});

	it('is switched off by the toggle rather than always applied', () => {
		assert.strictEqual(simplify.routing.output.postReceive[0].enabled, '={{ $value }}');
	});
});

describe('Title on Create', () => {
	const title = prop('additionalOptions').options.find((o) => o.name === 'title');

	it('is offered as an optional override', () => {
		assert.ok(title, 'no Title parameter');
		assert.strictEqual(title.type, 'string');
		assert.match(title.description, /generated from the content/i);
	});
});
