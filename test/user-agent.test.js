// The node stamps its own User-Agent so Gamma's public-API analytics can tell
// this node apart from a hand-rolled HTTP Request node. Two things can silently
// break that: the version in userAgent.ts drifting behind package.json, and a
// request path that skips the header and so inherits n8n's default UA.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const { USER_AGENT } = require('../dist/nodes/Gamma/userAgent.js');
const { version } = require('../package.json');

describe('User-Agent', () => {
	it('carries the product token the analytics bucket keys on', () => {
		assert.strictEqual(USER_AGENT.split('/')[0], 'n8n-nodes-gamma');
	});

	it('tracks the published package version', () => {
		// If this fails, bump VERSION in nodes/Gamma/userAgent.ts to match
		// package.json — a stale version misattributes every request.
		assert.strictEqual(USER_AGENT, `n8n-nodes-gamma/${version}`);
	});

	it('is set on requestDefaults, so every routed operation sends it', () => {
		const headers = new Gamma().description.requestDefaults.headers;
		assert.strictEqual(headers['User-Agent'], USER_AGENT);
	});
});
