// Example workflows and built assets, validated against the node's own schema.
//
// Catches what was actually wrong with the shipped example before this existed:
// a node `type` n8n cannot resolve, an operation value that does not exist, and
// parameters written at the wrong nesting level (so they were silently ignored).
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const pkg = require('../package.json');

const description = new Gamma().description;
const EXPECTED_TYPE = `${pkg.name}.${description.name}`;
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const ROOT = path.join(__dirname, '..');

/** name -> [properties]. A name can repeat: `operation` is declared per resource. */
function schemaIndex(props, prefix = '', out = new Map()) {
	for (const p of props || []) {
		if (!p.name) continue;
		const key = prefix ? `${prefix}.${p.name}` : p.name;
		if (!out.has(key)) out.set(key, []);
		out.get(key).push(p);
		if (Array.isArray(p.options) && p.type === 'collection') {
			schemaIndex(p.options.filter((o) => o && o.name && o.type), key, out);
		}
	}
	return out;
}
const schema = schemaIndex(description.properties);

/** Does displayOptions.show allow this example's parameters? */
function visibleFor(prop, params) {
	const show = prop.displayOptions?.show;
	if (!show) return true;
	return Object.entries(show).every(([dep, allowed]) => {
		const name = dep.replace(/^\//, '');
		return !(name in params) || allowed.includes(params[name]);
	});
}

function resolve(key, params) {
	const candidates = schema.get(key);
	if (!candidates) return undefined;
	return candidates.length === 1
		? candidates[0]
		: candidates.find((c) => visibleFor(c, params)) ?? candidates[0];
}

function collectProblems(params, root, prefix = '', problems = []) {
	for (const [name, value] of Object.entries(params || {})) {
		const key = prefix ? `${prefix}.${name}` : name;
		const prop = resolve(key, root);
		if (!prop) {
			problems.push(`parameter '${key}' does not exist on the node`);
			continue;
		}
		if (prop.type === 'collection' && value && typeof value === 'object' && !Array.isArray(value)) {
			collectProblems(value, root, key, problems);
		} else if (prop.type === 'options' && !(typeof value === 'string' && value.startsWith('='))) {
			const allowed = (prop.options || []).map((o) => o.value);
			if (!allowed.includes(value)) {
				problems.push(`${key}: ${JSON.stringify(value)} is not one of ${JSON.stringify(allowed)}`);
			}
		}
	}
	return problems;
}

const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json'));

describe('example workflows', () => {
	it('ships at least one', () => assert.ok(files.length > 0));

	for (const file of files) {
		describe(file, () => {
			const wf = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
			const gammaNodes = wf.nodes.filter((n) => /gamma/i.test(n.type));

			it('contains a Gamma node', () => assert.ok(gammaNodes.length > 0));

			it('connects only to nodes that exist', () => {
				const names = new Set(wf.nodes.map((n) => n.name));
				const dangling = [];
				for (const [from, conn] of Object.entries(wf.connections || {})) {
					if (!names.has(from)) dangling.push(`from '${from}'`);
					for (const branch of conn.main || []) {
						for (const target of branch || []) {
							if (!names.has(target.node)) dangling.push(`to '${target.node}'`);
						}
					}
				}
				assert.deepStrictEqual(dangling, []);
			});

			for (const n of gammaNodes) {
				it(`${n.name}: uses the resolvable package-qualified node type`, () => {
					// n8n-nodes-base.* is reserved for built-in nodes; a community
					// node's type is `<package>.<node>`, or the import silently fails.
					assert.strictEqual(n.type, EXPECTED_TYPE);
				});

				it(`${n.name}: references the gammaApi credential`, () => {
					assert.ok(n.credentials?.gammaApi);
				});

				it(`${n.name}: parameters exist at the right nesting level`, () => {
					assert.deepStrictEqual(collectProblems(n.parameters, n.parameters), []);
				});
			}
		});
	}
});

describe('built icon assets', () => {
	// Gulp 5 defaults to utf8 encoding, which corrupts binaries. The PNG was
	// silently mangled by the gulp 4 -> 5 upgrade until this check existed.
	const pairs = [
		['nodes/Gamma/gamma.png', 'dist/nodes/Gamma/gamma.png'],
		['nodes/Gamma/gamma.svg', 'dist/nodes/Gamma/gamma.svg'],
		['credentials/icons/gamma.svg', 'dist/credentials/icons/gamma.svg'],
	];

	for (const [from, to] of pairs) {
		it(`${to} is byte-identical to its source`, () => {
			assert.ok(fs.existsSync(path.join(ROOT, to)), `${to} missing from the build`);
			assert.ok(fs.readFileSync(path.join(ROOT, from)).equals(fs.readFileSync(path.join(ROOT, to))),
				'binary copy corrupted -- icon tasks need `encoding: false`');
		});
	}

	it('ships a valid 60x60 PNG', () => {
		const png = fs.readFileSync(path.join(ROOT, 'dist/nodes/Gamma/gamma.png'));
		assert.strictEqual(png.subarray(1, 4).toString(), 'PNG');
		assert.strictEqual(png.readUInt32BE(16), 60, 'width');
		assert.strictEqual(png.readUInt32BE(20), 60, 'height');
	});
});

describe('package manifest', () => {
	it('lists every declared node and credential in dist', () => {
		for (const f of [...pkg.n8n.nodes, ...pkg.n8n.credentials]) {
			assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} declared in package.json but missing`);
		}
	});

	it('ships zero runtime dependencies', () => {
		// Verified community nodes may not have runtime dependencies.
		assert.deepStrictEqual(Object.keys(pkg.dependencies ?? {}), []);
	});

	it('keeps the community-node keyword and a scoped n8n-nodes- name', () => {
		assert.ok(pkg.keywords.includes('n8n-community-node-package'));
		assert.match(pkg.name, /^(@[^/]+\/)?n8n-nodes-/);
	});
});
