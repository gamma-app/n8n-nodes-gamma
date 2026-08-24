// The declarative HTTP layer: which request each operation actually produces.
// Nothing here makes a network call.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const { GammaApi } = require('../dist/credentials/GammaApi.credentials.js');

const description = new Gamma().description;

/** Every operation option in the node, with the resource it belongs to. */
const operations = description.properties
	.filter((p) => p.name === 'operation')
	.flatMap((p) => (p.displayOptions?.show?.resource ?? []).flatMap((resource) =>
		p.options.map((o) => ({ resource, operation: o.value, routing: o.routing, action: o.action }))));

// Endpoints Gamma documents at developers.gamma.app (llms.txt, 2026-08-24).
const DOCUMENTED = new Set([
	'POST /v1.0/generations',
	'POST /v1.0/generations/from-template',
	'GET /v1.0/generations/{id}',
	'GET /v1.0/themes',
	'GET /v1.0/folders',
]);

/** Collapse an expression-interpolated path segment to {id} for comparison. */
const normalise = (url) => url.replace(/^=/, '').replace(/\{\{[^}]*\}\}/g, '{id}');

describe('request defaults', () => {
	it('points at the production API', () => {
		assert.strictEqual(description.requestDefaults.baseURL, 'https://public-api.gamma.app');
	});

	it('asks for and sends JSON', () => {
		assert.strictEqual(description.requestDefaults.headers.Accept, 'application/json');
		assert.strictEqual(description.requestDefaults.headers['Content-Type'], 'application/json');
	});
});

describe('credential', () => {
	const cred = new GammaApi();

	it('authenticates with the X-API-KEY header, not a bearer token', () => {
		// Gamma's docs are explicit that the header name is case-sensitive.
		assert.strictEqual(cred.authenticate.type, 'generic');
		assert.strictEqual(cred.authenticate.properties.headers['X-API-KEY'], '={{$credentials.apiKey}}');
	});

	it('keeps the API key a password field', () => {
		const apiKey = cred.properties.find((p) => p.name === 'apiKey');
		assert.strictEqual(apiKey.typeOptions.password, true);
	});

	it('tests against a documented endpoint', () => {
		const { baseURL, url, method } = cred.test.request;
		assert.strictEqual(`${method} ${url}`, 'GET /v1.0/themes');
		assert.strictEqual(baseURL, 'https://public-api.gamma.app');
		assert.ok(DOCUMENTED.has(`${method} ${url}`), 'credential test must hit a documented endpoint');
	});

	it('matches the credential name the node requires', () => {
		assert.strictEqual(cred.name, description.credentials[0].name);
	});
});

describe('operations', () => {
	it('declares at least the six shipped operations', () => {
		assert.ok(operations.length >= 6, `found ${operations.length}`);
	});

	for (const op of operations) {
		describe(`${op.resource}:${op.operation}`, () => {
			it('declares a method and URL', () => {
				assert.ok(op.routing?.request, 'no routing.request');
				assert.match(op.routing.request.method, /^(GET|POST|PUT|PATCH|DELETE)$/);
				assert.ok(op.routing.request.url, 'no url');
			});

			it('targets a versioned path', () => {
				assert.match(normalise(op.routing.request.url), /^\/v1\.0\//);
			});

			it('has an action name in sentence case', () => {
				assert.ok(op.action, 'no action label');
				assert.match(op.action, /^[A-Z][^A-Z]/, `"${op.action}" should be sentence case`);
			});
		});
	}

	it('routes only to documented endpoints', () => {
		const undocumented = operations
			.map((op) => `${op.routing.request.method} ${normalise(op.routing.request.url)}`)
			.filter((sig) => !DOCUMENTED.has(sig));

		// GET /v1.0/me appears nowhere in Gamma's published docs. It is a known
		// open question (see docs/n8n-readiness-audit.md): either the endpoint is
		// undocumented-but-real, or the User resource should be removed. Until one
		// call with a real key settles it, this test pins the exception so no NEW
		// undocumented endpoint slips in unnoticed.
		assert.deepStrictEqual(undocumented, ['GET /v1.0/me'],
			'unexpected undocumented endpoint(s): ' + undocumented.join(', '));
	});
});
