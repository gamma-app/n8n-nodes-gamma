// The Comment and Analytics resources.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const properties = new Gamma().description.properties;
const prop = (name, resource) => properties.find(
	(p) => p.name === name && p.displayOptions?.show?.resource?.includes(resource));
const opsOf = (resource) => prop('operation', resource).options
	.filter((o) => o.value !== '__CUSTOM_API_CALL__');
const route = (o) => `${o.routing.request.method} ${o.routing.request.url.replace(/^=/, '').replace(/\{\{[^}]*\}\}/g, '{id}')}`;

describe('Comment resource', () => {
	const ops = opsOf('comment');

	it('reads threads for a Gamma', () => {
		assert.deepStrictEqual(ops.map((o) => o.value), ['getAll']);
		assert.strictEqual(route(ops[0]), 'GET /v1.0/gammas/{id}/comments');
	});

	it('requires the Gamma to read', () => {
		assert.strictEqual(prop('commentGammaId', 'comment').required, true);
	});

	it('exposes updatedSince, which is what makes polling viable', () => {
		// Without it a scheduled workflow has to re-read every thread each run.
		const f = prop('commentAdditionalFields', 'comment').options.find((o) => o.name === 'updatedSince');
		assert.ok(f, 'no updatedSince field');
		assert.strictEqual(f.type, 'dateTime');
		assert.strictEqual(f.routing.request.qs.updatedSince, '={{ $value }}');
	});

	it('supports cursor paging and archived threads', () => {
		const names = prop('commentAdditionalFields', 'comment').options.map((o) => o.name);
		for (const n of ['after', 'includeArchived', 'limit']) {
			assert.ok(names.includes(n), `missing ${n}`);
		}
	});

	it('caps limit at the API maximum', () => {
		const limit = prop('commentAdditionalFields', 'comment').options.find((o) => o.name === 'limit');
		assert.strictEqual(limit.typeOptions.maxValue, 50);
	});

	it('simplifies away targetHtml and nested replies', () => {
		const simplify = prop('simplifyComments', 'comment');
		assert.strictEqual(simplify.default, true);
		assert.strictEqual(simplify.description,
			'Whether to return a simplified version of the response instead of the raw data');
		const keys = Object.keys(simplify.routing.output.postReceive[0].properties);
		assert.ok(!keys.includes('targetHtml'), 'targetHtml should be dropped');
		assert.ok(!keys.includes('replies'), 'replies should be collapsed');
		assert.ok(keys.includes('replyCount'), 'reply count should survive as a number');
		assert.ok(keys.length <= 10, `simplified output has ${keys.length} fields`);
	});
});

describe('Analytics resource', () => {
	const ops = opsOf('analytics');

	it('covers all four analytics endpoints', () => {
		assert.deepStrictEqual(ops.map((o) => o.value).sort(),
			['getCards', 'getDocument', 'getViewer', 'getViewers']);
	});

	const routes = {
		getDocument: 'GET /v1.0/gammas/{id}/analytics',
		getCards: 'GET /v1.0/gammas/{id}/analytics/cards',
		getViewers: 'GET /v1.0/gammas/{id}/analytics/viewers',
		getViewer: 'GET /v1.0/gammas/{id}/analytics/viewers/{id}',
	};
	for (const [value, expected] of Object.entries(routes)) {
		it(`${value} targets ${expected}`, () => {
			assert.strictEqual(route(ops.find((o) => o.value === value)), expected);
		});
	}

	it('asks for a viewer ID only when fetching one viewer', () => {
		assert.deepStrictEqual(prop('analyticsUserId', 'analytics').displayOptions.show.operation,
			['getViewer']);
		assert.strictEqual(prop('analyticsUserId', 'analytics').required, true);
	});

	it('tells the caller that permissions shape the result', () => {
		// Every response carries scope: all | self. Someone with only edit
		// permission gets their own row back and reads it as a bug otherwise.
		const viewers = ops.find((o) => o.value === 'getViewers');
		assert.match(viewers.description, /manage permission|edit/i);
		assert.match(prop('analyticsGammaId', 'analytics').description, /403|edit permission/i);
	});

	it('simplifies away the 30-day daily breakdown', () => {
		const simplify = prop('simplifyAnalytics', 'analytics');
		assert.deepStrictEqual(simplify.displayOptions.show.operation, ['getDocument']);
		const keys = Object.keys(simplify.routing.output.postReceive[0].properties);
		assert.ok(!keys.includes('dailyViews'), 'dailyViews should be dropped');
		assert.ok(keys.includes('scope'), 'scope matters for interpreting the numbers');
		assert.ok(keys.includes('totalViews') && keys.includes('uniqueViewers'));
	});

	it('paginates the viewer list only', () => {
		const fields = prop('analyticsAdditionalFields', 'analytics');
		assert.deepStrictEqual(fields.displayOptions.show.operation, ['getViewers']);
		assert.deepStrictEqual(fields.options.map((o) => o.name).sort(),
			['after', 'limit', 'sortDirection']);
	});
});
