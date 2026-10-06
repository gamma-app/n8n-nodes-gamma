// Guards the assembled description, which is now built from many modules in
// actions/. The risk the split introduces is ordering: n8n renders parameters
// in array order, so a mis-ordered import would scatter one resource's fields
// through another's.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { NodeHelpers } = require('n8n-workflow');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const node = new Gamma();
const properties = node.description.properties;
const resourceParam = properties.find((p) => p.name === 'resource');
const declaredResources = resourceParam.options.map((o) => o.value);

/** Whether n8n's editor shows `p` for these parameter values on this node version. */
const shown = (p, params, version) => NodeHelpers.displayParameter(
	params, p, { name: 'Gamma', type: 'gamma', typeVersion: version, position: [0, 0], parameters: params },
	node.description, params);

describe('assembled description', () => {
	it('puts the resource selector first', () => {
		assert.strictEqual(properties[0].name, 'resource');
	});

	it('keeps each resource\'s parameters in one contiguous run', () => {
		// Walk the properties and record the order resources first appear in. If a
		// resource shows up again after another has started, the assembly order in
		// Gamma.node.ts is wrong.
		const runs = [];
		for (const p of properties.slice(1)) {
			const res = p.displayOptions?.show?.resource;
			assert.ok(res, `'${p.name}' is not gated on a resource`);
			const key = res.join('+');
			if (runs[runs.length - 1] !== key) runs.push(key);
		}
		const seen = new Set();
		for (const key of runs) {
			assert.ok(!seen.has(key), `resource '${key}' appears in more than one run`);
			seen.add(key);
		}
	});

	it('declares one operation parameter per resource and node version', () => {
		for (const version of node.description.version) {
			for (const resource of declaredResources) {
				const ops = properties.filter((p) => p.name === 'operation' && shown(p, { resource }, version));
				assert.strictEqual(ops.length, 1, `${resource} v${version} has ${ops.length} operation parameters`);
			}
		}
	});

	it('gates every parameter on a resource the selector offers', () => {
		for (const p of properties.slice(1)) {
			for (const res of p.displayOptions.show.resource) {
				assert.ok(declaredResources.includes(res),
					`'${p.name}' is gated on unknown resource '${res}'`);
			}
		}
	});

	it('never shows two parameters with the same name at once', () => {
		// Operations may reuse a name (Format, Additional Options) as long as the
		// editor never shows both, so check what is visible per operation.
		for (const version of node.description.version) {
			for (const resource of declaredResources) {
				const operation = properties.find((p) => p.name === 'operation' && shown(p, { resource }, version));
				for (const { value } of operation.options) {
					const params = { resource, operation: value };
					const names = properties.filter((p) => shown(p, params, version)).map((p) => p.name);
					const dupes = names.filter((n, i) => names.indexOf(n) !== i);
					assert.deepStrictEqual(dupes, [], `${resource}:${value} v${version} shows duplicates: ${dupes}`);
				}
			}
		}
	});

	it('defaults Generation to classic on v1 and Gamma 5 on v2', () => {
		// n8n omits default-valued parameters from saved workflows, so v1's default
		// must never change: existing workflows would silently switch engines.
		const defaultFor = (version) => properties.find(
			(p) => p.name === 'operation' && shown(p, { resource: 'generation' }, version)).default;
		assert.strictEqual(defaultFor(1), 'create');
		assert.strictEqual(defaultFor(2), 'createAgent');
		assert.strictEqual(node.description.defaultVersion, 2);
	});

	it('exposes the listSearch methods the pickers reference', () => {
		const referenced = new Set();
		(function walk(props) {
			for (const p of props || []) {
				for (const mode of p.modes ?? []) {
					const m = mode.typeOptions?.searchListMethod;
					if (m) referenced.add(m);
				}
				if (Array.isArray(p.options)) walk(p.options.filter((o) => o && o.name && o.type));
			}
		})(properties);
		assert.ok(referenced.size > 0, 'no pickers found');
		for (const m of referenced) {
			assert.strictEqual(typeof node.methods.listSearch[m], 'function',
				`picker references missing method '${m}'`);
		}
	});
});
