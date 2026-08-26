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

// Endpoints Gamma documents at developers.gamma.app (llms.txt, verified
// 2026-08-25). Adding a route to the node without adding it here fails the
// "routes only to documented endpoints" test below -- which is the point: every
// new endpoint should be checked against the docs deliberately.
const DOCUMENTED = new Set([
	'POST /v1.0/generations',
	'POST /v1.0/generations/from-template',
	'GET /v1.0/generations/{id}',
	'POST /v1.0/images',
	'GET /v1.0/images/{id}',
	'POST /v1.0/images/media/{id}/archive',
	'GET /v1.0/gammas/{id}',
	'POST /v1.0/gammas/{id}/export',
	'POST /v1.0/gammas/{id}/archive',
	'DELETE /v1.0/gammas/{id}',
	'GET /v1.0/exports/{id}',
	'GET /v1.0/gammas/{id}/comments',
	'GET /v1.0/gammas/{id}/analytics',
	'GET /v1.0/gammas/{id}/analytics/cards',
	'GET /v1.0/gammas/{id}/analytics/viewers',
	'GET /v1.0/gammas/{id}/analytics/viewers/{id}',
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
	it('declares an operation for every shipped resource', () => {
		const resources = [...new Set(operations.map((o) => o.resource))].sort();
		assert.deepStrictEqual(resources,
			['analytics', 'comment', 'export', 'folder', 'gamma', 'generation', 'image',
				'theme', 'user']);
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

		// GET /v1.0/me appears nowhere in Gamma's published docs, but a live call
		// with a real key on 2026-08-25 confirmed it returns 200 with
		// { email, displayName, profileImageUrl, workspaceName, maxGenerateCards,
		// availableImageModels }. So it is real, useful, and unpublished.
		//
		// It stays, because the failure mode is contained: if Gamma retires it,
		// one read-only operation breaks rather than the node. For that same
		// reason nothing else should depend on it -- deriving the image-model list
		// or the numCards cap from /me would put the Create operation's UI at the
		// mercy of an endpoint nobody has committed to.
		//
		// This assertion pins the exception so no NEW undocumented endpoint slips
		// in unnoticed. Run `npm run test:live` to re-confirm /me still answers.
		assert.deepStrictEqual(undocumented, ['GET /v1.0/me'],
			'unexpected undocumented endpoint(s): ' + undocumented.join(', '));
	});
});
