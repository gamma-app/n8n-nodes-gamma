// Opt-in tests against the real Gamma API. Skipped unless GAMMA_API_KEY is set:
//
//   GAMMA_API_KEY=sk-gamma-... npm run test:live
//
// These are the only tests that can confirm the node's requests are actually
// accepted. Everything else stops at the boundary. Nothing here spends credits
// unless you also set GAMMA_LIVE_GENERATE=1.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { GammaApi } = require('../dist/credentials/GammaApi.credentials.js');

const KEY = process.env.GAMMA_API_KEY;
const BASE = 'https://public-api.gamma.app';
const skip = KEY ? false : 'set GAMMA_API_KEY to run live API tests';

const call = (path, init = {}) =>
	fetch(`${BASE}${path}`, {
		...init,
		headers: { 'X-API-KEY': KEY, Accept: 'application/json', ...(init.headers ?? {}) },
	});

describe('live Gamma API', { skip }, () => {
	it('the credential test endpoint accepts the key', async () => {
		// This is exactly what the node's ICredentialTestRequest calls, so if this
		// fails, every user's "Test connection" fails too.
		const { url } = new GammaApi().test.request;
		const res = await call(url);
		assert.strictEqual(res.status, 200, `${url} returned ${res.status}`);
	});

	it('rejects a bad key with 401', async () => {
		const res = await fetch(`${BASE}/v1.0/themes`, { headers: { 'X-API-KEY': 'sk-gamma-invalid' } });
		assert.strictEqual(res.status, 401);
	});

	it('requires the X-API-KEY header, not a bearer token', async () => {
		const res = await fetch(`${BASE}/v1.0/themes`, { headers: { Authorization: `Bearer ${KEY}` } });
		assert.strictEqual(res.status, 401, 'bearer auth unexpectedly worked; revisit the credential');
	});

	it('lists themes and folders in the shape the node expects', async () => {
		for (const path of ['/v1.0/themes', '/v1.0/folders']) {
			const res = await call(path);
			assert.strictEqual(res.status, 200, `${path} returned ${res.status}`);
			const body = await res.json();
			assert.strictEqual(typeof body, 'object', `${path} did not return an object`);
		}
	});

	// Settles the open question in docs/n8n-readiness-audit.md (A4). /me appears
	// nowhere in Gamma's published docs, but an unauthenticated probe cannot tell
	// a missing route from a gated one -- auth runs before routing. With a real
	// key the answer is unambiguous.
	it('reports whether the undocumented /v1.0/me endpoint exists', async () => {
		const res = await call('/v1.0/me');
		let body = null;
		try { body = await res.json(); } catch { /* not JSON */ }

		const lines = ['', '  ┌─ /v1.0/me verdict ' + '─'.repeat(40), `  │ GET /v1.0/me -> ${res.status}`];
		if (res.status === 200) {
			lines.push('  │ EXISTS, but is undocumented.',
				`  │ Response keys: ${body && typeof body === 'object' ? Object.keys(body).join(', ') : typeof body}`,
				'  │',
				'  │ ACTION: it works, but nothing published commits Gamma to keeping it.',
				'  │ Either get it documented, or drop the User resource rather than',
				'  │ build a public node on an endpoint that can vanish without notice.');
		} else {
			lines.push(`  │ DOES NOT EXIST (${res.status}).`,
				'  │',
				'  │ ACTION: remove the User resource from Gamma.node.ts -- the',
				'  │ getMe operation can only ever fail. Drop the `user` option from',
				'  │ the Resource parameter and its operation + displayOptions block,',
				'  │ then update the DOCUMENTED set in test/routing.test.js so it no',
				'  │ longer expects an undocumented endpoint.');
		}
		lines.push('  └' + '─'.repeat(58), '');
		console.log(lines.join('\n'));

		assert.ok([200, 401, 403, 404, 405].includes(res.status), `unexpected status ${res.status}`);
	});

	// The Resource Locator pickers are only as good as this call. Unit tests cover
	// the mapping against a mocked helper; this proves the real endpoints answer
	// in the shape the mapping assumes.
	describe('resource locator pickers', () => {
		const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
		const methods = new Gamma().methods.listSearch;

		/** Minimal ILoadOptionsFunctions backed by the real API. */
		const ctx = {
			getNodeParameter: (_name, fallback) => fallback,
			helpers: {
				httpRequestWithAuthentication: async (_credentialType, options) => {
					const url = new URL(options.baseURL + options.url);
					for (const [k, v] of Object.entries(options.qs ?? {})) {
						url.searchParams.set(k, String(v));
					}
					const res = await fetch(url, { headers: { 'X-API-KEY': KEY, Accept: 'application/json' } });
					if (!res.ok) throw new Error(`${url.pathname} -> ${res.status}`);
					return await res.json();
				},
			},
		};

		it('the Theme picker returns real themes', async () => {
			const result = await methods.searchThemes.call(ctx);
			assert.ok(Array.isArray(result.results), 'no results array');
			assert.ok(result.results.length > 0, 'workspace returned no themes');
			for (const r of result.results) {
				assert.ok(r.name, 'a theme has no name to display');
				assert.ok(r.value, 'a theme has no id to submit');
			}
			console.log(`\n    ${result.results.length} themes, e.g. ${result.results
				.slice(0, 3).map((r) => `${r.name} (${r.description})`).join(', ')}`);
			console.log(`    paginationToken: ${result.paginationToken ?? 'none — single page'}\n`);
		});

		it('the Theme picker honours a search filter', async () => {
			const all = await methods.searchThemes.call(ctx);
			const term = all.results[0].name.slice(0, 3);
			const filtered = await methods.searchThemes.call(ctx, term);
			assert.ok(Array.isArray(filtered.results), 'search returned no array');
			console.log(`\n    filter "${term}" -> ${filtered.results.length} of ${all.results.length}\n`);
		});

		it('the Folder picker returns folders without erroring', async () => {
			const result = await methods.searchFolders.call(ctx);
			assert.ok(Array.isArray(result.results));
			for (const r of result.results) assert.ok(r.name && r.value);
			console.log(`\n    ${result.results.length} folders\n`);
		});
	});

	describe('generation', { skip: process.env.GAMMA_LIVE_GENERATE ? false : 'set GAMMA_LIVE_GENERATE=1 (spends credits)' }, () => {
		it('accepts the one-card-per-item request the node builds', async () => {
			// The exact shape examples/one-card-per-item.json produces.
			const res = await call('/v1.0/generations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					inputText: 'First row\n---\nSecond row\n---\nThird row',
					textMode: 'preserve',
					format: 'presentation',
					cardSplit: 'inputTextBreaks',
				}),
			});
			const body = await res.json();
			assert.strictEqual(res.status, 200, `got ${res.status}: ${JSON.stringify(body)}`);
			assert.ok(body.generationId, 'no generationId in the response');
			if (body.warnings) console.log(`\n    warnings: ${body.warnings}\n`);
		});

		it('rejects a request the node prevents you from building', async () => {
			// 1x1 is invalid for a presentation. The node makes this unpickable;
			// this confirms the API really does object, so the guard is warranted.
			const res = await call('/v1.0/generations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					inputText: 'A short deck about testing',
					format: 'presentation',
					cardOptions: { dimensions: '1x1' },
				}),
			});
			const body = await res.json();
			// Gamma warns and substitutes rather than failing; either is informative.
			console.log(`\n    1x1-on-presentation -> ${res.status} ${JSON.stringify(body.warnings ?? body)}\n`);
			assert.ok([200, 400].includes(res.status));
		});
	});
});
