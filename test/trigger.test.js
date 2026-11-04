// The Gamma Trigger: polling state, event classification and the requests it
// makes. A small in-memory Gamma stands in for the API, following the
// documented behaviour of GET /v1.0/gammas/{id}/comments (updatedSince, limit,
// after/nextCursor, newest first) and GET /v1.0/gammas/search (updatedAfter and
// updatedBefore inclusive, 25 hits max, last-updated first, no cursor).
// Nothing here makes a network call.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { NodeHelpers } = require('n8n-workflow');
const { GammaTrigger } = require('../dist/nodes/Gamma/GammaTrigger.node.js');
const { LOOKBACK_MS } = require('../dist/nodes/Gamma/trigger/state.js');

const trigger = new GammaTrigger();
const GAMMA = 'g_l0mf2jvf1fpmi1v';
const T0 = Date.parse('2026-11-01T12:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();
const MIN = 60 * 1000;

/** An in-memory Gamma workspace that answers like the public API. */
class FakeGamma {
	constructor() {
		this.threads = [];
		this.gammas = [];
		this.requests = [];
	}

	comment(id, at, extra = {}) {
		const thread = {
			id,
			cardId: 'card_1',
			targetText: 'Q3 revenue',
			targetHtml: '<p>Q3 revenue</p>',
			author: { id: 'u_ana', name: 'Ana' },
			contentText: `comment ${id}`,
			status: 'open',
			archived: false,
			mentionedUsers: [],
			replies: [],
			createdTime: iso(at),
			updatedTime: iso(at),
			...extra,
		};
		this.threads.push(thread);
		return thread;
	}

	reply(threadId, id, at) {
		const thread = this.threads.find((t) => t.id === threadId);
		thread.replies.push({
			id,
			author: { id: 'u_ben', name: 'Ben' },
			contentText: `reply ${id}`,
			mentionedUsers: ['u_ana'],
			archived: false,
			createdTime: iso(at),
			updatedTime: iso(at),
		});
		thread.updatedTime = iso(at);
	}

	resolve(threadId, at) {
		const thread = this.threads.find((t) => t.id === threadId);
		thread.status = 'closed';
		thread.updatedTime = iso(at);
	}

	gamma(id, at, extra = {}) {
		const existing = this.gammas.find((g) => g.id === id);
		if (existing) {
			existing.updatedTime = iso(at);
			return existing;
		}
		const g = {
			id,
			title: `Deck ${id}`,
			url: `https://gamma.app/docs/${id}`,
			highlight: null,
			createdBy: 'Ana',
			updatedTime: iso(at),
			archived: false,
			...extra,
		};
		this.gammas.push(g);
		return g;
	}

	handle(options) {
		this.requests.push(options);
		const qs = options.qs ?? {};
		const comments = options.url.match(/^\/v1\.0\/gammas\/([^/]+)\/comments$/);
		if (comments) {
			if (decodeURIComponent(comments[1]) !== GAMMA) {
				const error = new Error('Gamma not found');
				error.httpCode = '404';
				throw error;
			}
			const since = qs.updatedSince ? Date.parse(qs.updatedSince) : -Infinity;
			const matching = this.threads
				.filter((t) => Date.parse(t.updatedTime) > since)
				.filter((t) => qs.includeArchived || !t.archived)
				.sort((a, b) => Date.parse(b.updatedTime) - Date.parse(a.updatedTime));
			const start = qs.after ? Number(qs.after) : 0;
			const limit = qs.limit ?? 50;
			const data = matching.slice(start, start + limit);
			const hasMore = start + limit < matching.length;
			return { data, hasMore, nextCursor: hasMore ? String(start + limit) : null };
		}
		if (options.url === '/v1.0/gammas/search') {
			const after = qs.updatedAfter ? Date.parse(qs.updatedAfter) : -Infinity;
			const before = qs.updatedBefore ? Date.parse(qs.updatedBefore) : Infinity;
			const hits = this.gammas
				.filter((g) => Date.parse(g.updatedTime) >= after && Date.parse(g.updatedTime) <= before)
				.filter((g) => !qs.createdBy || g.createdBy === qs.createdBy)
				.filter((g) => qs.includeArchived || !g.archived)
				.sort((a, b) => Date.parse(b.updatedTime) - Date.parse(a.updatedTime))
				.slice(0, Math.min(qs.limit ?? 25, 25));
			return { hits };
		}
		throw new Error(`unexpected request ${options.method} ${options.url}`);
	}
}

/** A minimal IPollFunctions around a FakeGamma, with a controllable clock. */
function poller(api, params, { mode = 'trigger', staticData = {} } = {}) {
	const warnings = [];
	return {
		staticData,
		warnings,
		getNodeParameter(name, fallback, options) {
			const value = Object.prototype.hasOwnProperty.call(params, name) ? params[name] : fallback;
			if (options?.extractValue && value && typeof value === 'object') return value.value;
			return value;
		},
		getMode: () => mode,
		getNode: () => ({ name: 'Gamma Trigger', type: 'gammaTrigger', typeVersion: 1, position: [0, 0], parameters: {} }),
		getWorkflowStaticData: () => staticData,
		logger: { warn: (message) => warnings.push(message), debug() {}, info() {}, error() {} },
		helpers: {
			httpRequestWithAuthentication: async function (credentialType, options) {
				assert.strictEqual(credentialType, 'gammaApi');
				return api.handle(options);
			},
		},
	};
}

/** Runs `fn` with Date.now() pinned to `ms`. */
async function at(ms, fn) {
	const real = Date.now;
	Date.now = () => ms;
	try {
		return await fn();
	} finally {
		Date.now = real;
	}
}

const COMMENT_PARAMS = {
	event: 'comment',
	gammaId: { __rl: true, mode: 'list', value: GAMMA },
	commentEvents: ['commentCreated', 'replyCreated'],
	commentOptions: {},
};

const events = (out) => (out ? out[0].map((i) => i.json.event) : []);

describe('Gamma Trigger description', () => {
	const d = trigger.description;

	it('is a polling trigger with no inputs', () => {
		assert.strictEqual(d.polling, true);
		assert.deepStrictEqual(d.inputs, []);
		assert.deepStrictEqual(d.group, ['trigger']);
		assert.strictEqual(d.name, 'gammaTrigger');
		assert.strictEqual(typeof trigger.poll, 'function');
	});

	it('authenticates with the same credential as the Gamma node', () => {
		assert.deepStrictEqual(d.credentials, [{ name: 'gammaApi', required: true }]);
	});

	it('backs the Gamma picker with a listSearch method that exists', () => {
		const picker = d.properties.find((p) => p.name === 'gammaId');
		const method = picker.modes.find((m) => m.type === 'list').typeOptions.searchListMethod;
		assert.strictEqual(typeof trigger.methods.listSearch[method], 'function');
	});

	it('shows comment parameters only for comment activity, and filters only for Gamma changes', () => {
		const shown = (name, event) => NodeHelpers.displayParameter(
			{ event }, d.properties.find((p) => p.name === name),
			{ name: 'Gamma Trigger', type: 'gammaTrigger', typeVersion: 1, position: [0, 0], parameters: { event } },
			d, { event });
		assert.ok(shown('gammaId', 'comment'));
		assert.ok(!shown('gammaId', 'gammaUpdated'));
		assert.ok(shown('gammaFilters', 'gammaUpdated'));
		assert.ok(!shown('gammaFilters', 'comment'));
	});

	it('is registered in package.json and ships a codex file', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
		assert.ok(pkg.n8n.nodes.includes('dist/nodes/Gamma/GammaTrigger.node.js'));
		const codex = JSON.parse(fs.readFileSync(
			path.join(__dirname, '..', 'dist', 'nodes', 'Gamma', 'GammaTrigger.node.json'), 'utf8'));
		assert.strictEqual(codex.node, `${pkg.name}.gammaTrigger`);
	});
});

describe('Gamma Trigger: comment activity', () => {
	it('does not replay existing comments when the workflow is activated', async () => {
		const api = new FakeGamma();
		api.comment('c_old', T0 - 10 * MIN);
		api.comment('c_recent', T0 - 30 * 1000);
		const ctx = poller(api, COMMENT_PARAMS);
		assert.strictEqual(await at(T0, () => trigger.poll.call(ctx)), null);
		assert.ok(ctx.staticData.pollState, 'state recorded');
		// The next poll must not report c_recent, even though it sits inside the lookback window.
		assert.strictEqual(await at(T0 + MIN, () => trigger.poll.call(ctx)), null);
	});

	it('reports a new comment once, with the simplified fields', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_1', T0 + 30 * 1000, { mentionedUsers: ['u_ben'] });

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(out[0][0].json, {
			event: 'commentCreated',
			gammaId: GAMMA,
			commentId: 'c_1',
			cardId: 'card_1',
			status: 'open',
			archived: false,
			targetText: 'Q3 revenue',
			contentText: 'comment c_1',
			authorId: 'u_ana',
			authorName: 'Ana',
			mentionedUsers: ['u_ben'],
			replyCount: 0,
			createdTime: iso(T0 + 30 * 1000),
			updatedTime: iso(T0 + 30 * 1000),
		});
		assert.strictEqual(await at(T0 + 2 * MIN, () => trigger.poll.call(ctx)), null, 'reported twice');
	});

	it('reports a reply as a reply, not as a changed comment', async () => {
		const api = new FakeGamma();
		api.comment('c_1', T0 - 60 * MIN);
		const ctx = poller(api, { ...COMMENT_PARAMS, commentEvents: ['commentCreated', 'replyCreated', 'commentUpdated'] });
		await at(T0, () => trigger.poll.call(ctx));
		api.reply('c_1', 'r_1', T0 + 10 * 1000);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(events(out), ['replyCreated']);
		const reply = out[0][0].json;
		assert.strictEqual(reply.replyId, 'r_1');
		assert.strictEqual(reply.commentId, 'c_1');
		assert.strictEqual(reply.authorName, 'Ben');
		assert.strictEqual(reply.threadContentText, 'comment c_1');
		assert.strictEqual(reply.threadAuthorName, 'Ana');
	});

	it('reports a comment and its replies when both land between polls', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_1', T0 + 5 * 1000);
		api.reply('c_1', 'r_1', T0 + 10 * 1000);
		api.reply('c_1', 'r_2', T0 + 20 * 1000);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(events(out), ['commentCreated', 'replyCreated', 'replyCreated']);
		assert.deepStrictEqual(out[0].slice(1).map((i) => i.json.replyId), ['r_1', 'r_2']);
	});

	it('emits oldest first across threads', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_late', T0 + 40 * 1000);
		api.comment('c_early', T0 + 10 * 1000);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(out[0].map((i) => i.json.commentId), ['c_early', 'c_late']);
	});

	it('only reports resolving a comment when Comment Updated is selected', async () => {
		const api = new FakeGamma();
		api.comment('c_1', T0 - 60 * MIN);
		const quiet = poller(api, COMMENT_PARAMS);
		const all = poller(api, { ...COMMENT_PARAMS, commentEvents: ['commentUpdated'] });
		await at(T0, () => trigger.poll.call(quiet));
		await at(T0, () => trigger.poll.call(all));
		api.resolve('c_1', T0 + 10 * 1000);

		assert.strictEqual(await at(T0 + MIN, () => trigger.poll.call(quiet)), null);
		const out = await at(T0 + MIN, () => trigger.poll.call(all));
		assert.deepStrictEqual(events(out), ['commentUpdated']);
		assert.strictEqual(out[0][0].json.status, 'closed');
	});

	it('does not replay skipped events when the subscription is widened later', async () => {
		const api = new FakeGamma();
		api.comment('c_1', T0 - 60 * MIN);
		const params = { ...COMMENT_PARAMS };
		const ctx = poller(api, params);
		await at(T0, () => trigger.poll.call(ctx));
		api.resolve('c_1', T0 + 10 * 1000);
		assert.strictEqual(await at(T0 + MIN, () => trigger.poll.call(ctx)), null);

		params.commentEvents = ['commentCreated', 'replyCreated', 'commentUpdated'];
		assert.strictEqual(await at(T0 + 2 * MIN, () => trigger.poll.call(ctx)), null);
	});

	it('still reports a comment that becomes visible after something newer', async () => {
		// Written at T0+20s, but the API only returns it on a later poll, after the
		// trigger has already seen a comment from T0+40s.
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_newer', T0 + 40 * 1000);
		assert.deepStrictEqual(events(await at(T0 + MIN, () => trigger.poll.call(ctx))), ['commentCreated']);

		api.comment('c_lagged', T0 + 20 * 1000);
		const out = await at(T0 + 2 * MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(out[0].map((i) => i.json.commentId), ['c_lagged']);
	});

	it('reads from the high-water mark minus the lookback window', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_1', T0 + 30 * 1000);
		await at(T0 + MIN, () => trigger.poll.call(ctx));
		api.requests.length = 0;

		await at(T0 + 2 * MIN, () => trigger.poll.call(ctx));
		const { qs, url, headers } = api.requests[0];
		assert.strictEqual(url, `/v1.0/gammas/${GAMMA}/comments`);
		assert.strictEqual(qs.updatedSince, iso(T0 + 30 * 1000 - LOOKBACK_MS));
		assert.strictEqual(qs.limit, 50, 'must not exceed the API maximum');
		assert.match(headers['User-Agent'], /^n8n-nodes-gamma\//);
	});

	it('pages through every changed thread', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		for (let i = 0; i < 120; i++) api.comment(`c_${i}`, T0 + 1000 + i * 100);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.strictEqual(out[0].length, 120);
		assert.strictEqual(new Set(out[0].map((i) => i.json.commentId)).size, 120);
		assert.deepStrictEqual(api.requests.slice(-3).map((r) => r.qs.after), [undefined, '50', '100']);
	});

	it('stops at the request cap and logs that it did', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.requests.length = 0;
		for (let i = 0; i < 1100; i++) api.comment(`c_${i}`, T0 + 1000 + i * 10);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.strictEqual(api.requests.length, 20);
		assert.strictEqual(out[0].length, 1000);
		assert.strictEqual(ctx.warnings.length, 1);
		assert.match(ctx.warnings[0], /1000 comment threads/);
	});

	it('keeps its state small by forgetting what can no longer come back', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_1', T0 + 1000);
		await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.ok(Object.keys(ctx.staticData.pollState.seen).length > 0);

		api.comment('c_2', T0 + 30 * MIN);
		await at(T0 + 31 * MIN, () => trigger.poll.call(ctx));
		const keys = Object.keys(ctx.staticData.pollState.seen);
		assert.ok(keys.every((k) => !k.includes('c_1')), `stale keys kept: ${keys}`);
	});

	it('keeps its state when the first poll for a newly chosen Gamma fails', async () => {
		const api = new FakeGamma();
		const params = { ...COMMENT_PARAMS };
		const ctx = poller(api, params);
		await at(T0, () => trigger.poll.call(ctx));
		const scope = ctx.staticData.pollState.scope;
		params.gammaId = { __rl: true, mode: 'id', value: 'g_other' };
		await assert.rejects(at(T0 + MIN, () => trigger.poll.call(ctx)));
		assert.strictEqual(ctx.staticData.pollState.scope, scope, 'state replaced by a failed poll');
	});

	it('sends includeArchived only when asked', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, { ...COMMENT_PARAMS, commentOptions: { includeArchived: true } });
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_gone', T0 + 10 * 1000, { archived: true });
		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.strictEqual(api.requests[0].qs.includeArchived, true);
		assert.strictEqual(out[0][0].json.archived, true);

		const plain = new FakeGamma();
		const ctx2 = poller(plain, COMMENT_PARAMS);
		await at(T0, () => trigger.poll.call(ctx2));
		assert.ok(!('includeArchived' in plain.requests[0].qs));
	});

	it('returns the raw thread when Simplify is off', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, { ...COMMENT_PARAMS, commentOptions: { simplify: false } });
		await at(T0, () => trigger.poll.call(ctx));
		api.comment('c_1', T0 + 1000);
		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		const json = out[0][0].json;
		assert.strictEqual(json.event, 'commentCreated');
		assert.strictEqual(json.comment.targetHtml, '<p>Q3 revenue</p>');
	});

	it('wraps API failures in a NodeApiError', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, { ...COMMENT_PARAMS, gammaId: { mode: 'id', value: 'g_missing' } });
		await assert.rejects(at(T0, () => trigger.poll.call(ctx)), (error) => {
			assert.strictEqual(error.constructor.name, 'NodeApiError');
			return true;
		});
	});

	it('rejects an empty Gamma', async () => {
		const ctx = poller(new FakeGamma(), { ...COMMENT_PARAMS, gammaId: { mode: 'id', value: '  ' } });
		await assert.rejects(at(T0, () => trigger.poll.call(ctx)), /No Gamma selected/);
	});
});

describe('Gamma Trigger: test event (manual mode)', () => {
	it('returns the latest matching activity and leaves the state alone', async () => {
		const api = new FakeGamma();
		api.comment('c_1', T0 - 5 * 24 * 60 * MIN);
		api.comment('c_2', T0 - 60 * MIN);
		const ctx = poller(api, COMMENT_PARAMS, { mode: 'manual' });
		const out = await at(T0, () => trigger.poll.call(ctx));
		assert.strictEqual(out[0].length, 1);
		assert.strictEqual(out[0][0].json.commentId, 'c_2');
		assert.deepStrictEqual(ctx.staticData, {});
		assert.strictEqual(api.requests.length, 1);
	});

	it('explains what to do when there is nothing to show', async () => {
		const ctx = poller(new FakeGamma(), COMMENT_PARAMS, { mode: 'manual' });
		await assert.rejects(at(T0, () => trigger.poll.call(ctx)), /No matching activity/);
	});
});

describe('Gamma Trigger: Gamma created or updated', () => {
	const PARAMS = { event: 'gammaUpdated', gammaFilters: {} };

	it('reports new and edited Gammas, each saved version once', async () => {
		const api = new FakeGamma();
		api.gamma('g_a', T0 - 60 * MIN);
		const ctx = poller(api, PARAMS);
		assert.strictEqual(await at(T0, () => trigger.poll.call(ctx)), null);

		api.gamma('g_b', T0 + 10 * 1000);
		api.gamma('g_a', T0 + 20 * 1000);
		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(out[0].map((i) => i.json.gammaId), ['g_b', 'g_a']);
		assert.deepStrictEqual(out[0][0].json, {
			event: 'gammaUpdated',
			gammaId: 'g_b',
			title: 'Deck g_b',
			url: 'https://gamma.app/docs/g_b',
			createdBy: 'Ana',
			archived: false,
			updatedTime: iso(T0 + 10 * 1000),
		});
		// Inclusive lower bound: the boundary hits come back, and must not fire again.
		assert.strictEqual(await at(T0 + 2 * MIN, () => trigger.poll.call(ctx)), null);

		api.gamma('g_a', T0 + 3 * MIN);
		const again = await at(T0 + 4 * MIN, () => trigger.poll.call(ctx));
		assert.deepStrictEqual(again[0].map((i) => i.json.gammaId), ['g_a']);
	});

	it('walks the window backwards to read more than one page of hits', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.requests.length = 0;
		for (let i = 0; i < 60; i++) api.gamma(`g_${i}`, T0 + 1000 + i * 100);

		const out = await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.strictEqual(out[0].length, 60);
		assert.strictEqual(new Set(out[0].map((i) => i.json.gammaId)).size, 60);
		assert.ok(api.requests.length >= 3);
		assert.strictEqual(api.requests[0].qs.updatedBefore, undefined);
		assert.strictEqual(api.requests[1].qs.updatedBefore, iso(T0 + 1000 + 35 * 100));
		assert.ok(api.requests.every((r) => r.qs.limit === 25), 'must not exceed the API maximum');
	});

	it('does not loop when a whole page shares one timestamp', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, PARAMS);
		await at(T0, () => trigger.poll.call(ctx));
		api.requests.length = 0;
		for (let i = 0; i < 30; i++) api.gamma(`g_${i}`, T0 + 1000);
		await at(T0 + MIN, () => trigger.poll.call(ctx));
		assert.ok(api.requests.length <= 2, `${api.requests.length} requests`);
	});

	it('passes the Created By and Include Archived filters through', async () => {
		const api = new FakeGamma();
		const ctx = poller(api, { event: 'gammaUpdated', gammaFilters: { createdBy: ' me ', includeArchived: true } });
		await at(T0, () => trigger.poll.call(ctx));
		assert.strictEqual(api.requests[0].qs.createdBy, 'me');
		assert.strictEqual(api.requests[0].qs.includeArchived, true);
		assert.strictEqual(api.requests[0].url, '/v1.0/gammas/search');
	});

	it('starts over when the filters change', async () => {
		const api = new FakeGamma();
		const params = { event: 'gammaUpdated', gammaFilters: {} };
		const ctx = poller(api, params);
		await at(T0, () => trigger.poll.call(ctx));
		api.gamma('g_a', T0 + 1000, { createdBy: 'me' });
		params.gammaFilters = { createdBy: 'me' };
		// The first poll under new filters records instead of emitting.
		assert.strictEqual(await at(T0 + MIN, () => trigger.poll.call(ctx)), null);
		assert.match(ctx.staticData.pollState.scope, /:me:/);
	});
});

describe('Gamma picker (searchGammas)', () => {
	function context(body) {
		const calls = [];
		return {
			calls,
			helpers: {
				httpRequestWithAuthentication: async function (credentialType, options) {
					calls.push({ credentialType, options });
					return body;
				},
			},
		};
	}
	const HITS = { hits: [
		{ id: 'g_1', title: 'Q3 Review', url: 'https://gamma.app/docs/g_1', createdBy: 'Ana', updatedTime: iso(T0) },
		{ id: 'g_2', title: null, url: 'https://gamma.app/docs/g_2', createdBy: null, updatedTime: iso(T0) },
	] };

	it('maps hits to picker entries', async () => {
		const res = await trigger.methods.listSearch.searchGammas.call(context(HITS));
		assert.deepStrictEqual(res.results, [
			{ name: 'Q3 Review', value: 'g_1', url: 'https://gamma.app/docs/g_1', description: 'Ana' },
			{ name: 'Untitled', value: 'g_2', url: 'https://gamma.app/docs/g_2', description: undefined },
		]);
	});

	it('searches by text, or lists the most recent Gammas when empty', async () => {
		const searching = context(HITS);
		await trigger.methods.listSearch.searchGammas.call(searching, 'review');
		assert.deepStrictEqual(searching.calls[0].options.qs, { limit: 25, q: 'review' });

		const browsing = context(HITS);
		await trigger.methods.listSearch.searchGammas.call(browsing);
		assert.deepStrictEqual(browsing.calls[0].options.qs, { limit: 25, updatedAfter: '1970-01-01T00:00:00.000Z' });
		assert.strictEqual(browsing.calls[0].options.url, '/v1.0/gammas/search');
	});

	it('survives a response with no hits array', async () => {
		const res = await trigger.methods.listSearch.searchGammas.call(context({}));
		assert.deepStrictEqual(res.results, []);
	});
});
