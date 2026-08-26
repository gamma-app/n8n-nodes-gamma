// Guards the assembled description, which is now built from many modules in
// actions/. The risk the split introduces is ordering: n8n renders parameters
// in array order, so a mis-ordered import would scatter one resource's fields
// through another's.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');

const node = new Gamma();
const properties = node.description.properties;
const resourceParam = properties.find((p) => p.name === 'resource');
const declaredResources = resourceParam.options.map((o) => o.value);

describe('assembled description', () => {
	it('puts the resource selector first', () => {
		assert.strictEqual(properties[0].name, 'resource');
	});

	it('keeps each resource\'s parameters in one contiguous run', () => {
		// Walk the properties and record the order resources first appear in. If a
		// resource shows up again after another has started, the assembly order in
		// actions/versionDescription.ts is wrong.
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

	it('declares an operation parameter for every resource in the selector', () => {
		for (const resource of declaredResources) {
			const ops = properties.filter(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource));
			assert.strictEqual(ops.length, 1, `${resource} has ${ops.length} operation parameters`);
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

	it('has no duplicate parameter names within a resource', () => {
		const byResource = new Map();
		for (const p of properties.slice(1)) {
			const key = p.displayOptions.show.resource.join('+');
			if (!byResource.has(key)) byResource.set(key, []);
			byResource.get(key).push(p.name);
		}
		for (const [resource, names] of byResource) {
			// `operation` is legitimately once per resource; anything else repeating
			// means two modules exported the same parameter.
			const dupes = names.filter((n, i) => names.indexOf(n) !== i);
			assert.deepStrictEqual(dupes, [], `${resource} declares duplicates: ${dupes}`);
		}
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
