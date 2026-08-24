// Validates every workflow in examples/ against the built node's own schema.
// Run with `npm test`.
//
// Catches the two things that were wrong with the shipped example before this
// existed: a node `type` that n8n cannot resolve, and parameters written at the
// wrong nesting level (so they were silently ignored).
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Gamma } = require('../dist/nodes/Gamma/Gamma.node.js');
const pkg = require('../package.json');

const EXPECTED_TYPE = `${pkg.name}.${new Gamma().description.name}`;
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');

/** name -> [properties]. A name can appear more than once: `operation` is
 *  declared per resource, each gated by displayOptions. */
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

/** Does this property's displayOptions.show allow the example's parameters? */
function visibleFor(prop, params) {
	const show = prop.displayOptions?.show;
	if (!show) return true;
	return Object.entries(show).every(([dep, allowed]) => {
		const name = dep.replace(/^\//, '');
		if (!(name in params)) return true; // not constrained by this example
		return allowed.includes(params[name]);
	});
}

/** Pick the property that actually applies, given the example's other params. */
function resolve(key, params) {
	const candidates = schema.get(key);
	if (!candidates) return undefined;
	if (candidates.length === 1) return candidates[0];
	return candidates.find((c) => visibleFor(c, params)) ?? candidates[0];
}

const schema = schemaIndex(new Gamma().description.properties);
let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };

function checkValue(key, prop, value) {
	if (prop.type !== 'options') return;
	// Expressions are resolved at runtime; nothing to validate statically.
	if (typeof value === 'string' && value.startsWith('=')) return;
	const allowed = (prop.options || []).map((o) => o.value);
	if (!allowed.includes(value)) {
		fail(`${key}: ${JSON.stringify(value)} is not one of ${JSON.stringify(allowed)}`);
	}
}

function checkParams(file, nodeName, params, prefix = '', root = params) {
	for (const [name, value] of Object.entries(params || {})) {
		const key = prefix ? `${prefix}.${name}` : name;
		const prop = resolve(key, root);
		if (!prop) {
			fail(`${file} / ${nodeName}: parameter '${key}' does not exist on the node`);
			continue;
		}
		if (prop.type === 'collection' && value && typeof value === 'object' && !Array.isArray(value)) {
			checkParams(file, nodeName, value, key, root);
		} else {
			checkValue(`${file} / ${nodeName}: ${key}`, prop, value);
		}
	}
}

const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json'));
assert.ok(files.length > 0, 'no example workflows found');
console.log(`validating ${files.length} example workflow(s) against ${EXPECTED_TYPE}\n`);

for (const file of files) {
	const wf = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
	assert.ok(Array.isArray(wf.nodes), `${file}: no nodes array`);

	const names = new Set(wf.nodes.map((n) => n.name));
	for (const [from, conn] of Object.entries(wf.connections || {})) {
		if (!names.has(from)) fail(`${file}: connection from unknown node '${from}'`);
		for (const branch of conn.main || []) {
			for (const target of branch || []) {
				if (!names.has(target.node)) fail(`${file}: connection to unknown node '${target.node}'`);
			}
		}
	}

	const gammaNodes = wf.nodes.filter((n) => /gamma/i.test(n.type));
	if (gammaNodes.length === 0) fail(`${file}: contains no Gamma node`);

	for (const n of gammaNodes) {
		if (n.type !== EXPECTED_TYPE) {
			fail(`${file} / ${n.name}: type is '${n.type}', expected '${EXPECTED_TYPE}'`);
		}
		if (!n.credentials?.gammaApi) fail(`${file} / ${n.name}: no gammaApi credential reference`);
		checkParams(file, n.name, n.parameters);
	}
	console.log(`  ${file}: ${wf.nodes.length} nodes, ${gammaNodes.length} Gamma`);
}

// --- icon assets must survive the build byte-for-byte -----------------------
// Gulp 5 defaults to utf8 encoding, which corrupts binary files. The PNG icon
// was silently mangled by the gulp 4 -> 5 upgrade until this check existed.
console.log('\nicon assets copied intact:');
const iconPairs = [
	['nodes/Gamma/gamma.png', 'dist/nodes/Gamma/gamma.png'],
	['nodes/Gamma/gamma.svg', 'dist/nodes/Gamma/gamma.svg'],
	['credentials/icons/gamma.svg', 'dist/credentials/icons/gamma.svg'],
];
for (const [from, to] of iconPairs) {
	const a = path.join(__dirname, '..', from);
	const b = path.join(__dirname, '..', to);
	if (!fs.existsSync(b)) { fail(`${to} missing from the build`); continue; }
	const src = fs.readFileSync(a), out = fs.readFileSync(b);
	if (!src.equals(out)) {
		fail(`${to} differs from ${from} (${src.length} -> ${out.length} bytes) -- binary copy corrupted`);
	} else {
		console.log(`  ok    ${to} (${out.length} bytes)`);
	}
}

// PNG icons must be exactly 60x60 per n8n's troubleshooting docs.
const png = fs.readFileSync(path.join(__dirname, '..', 'dist/nodes/Gamma/gamma.png'));
if (png.slice(1, 4).toString() !== 'PNG') {
	fail('dist PNG icon is not a valid PNG');
} else {
	const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
	if (w !== 60 || h !== 60) fail(`PNG icon is ${w}x${h}, expected 60x60`);
	else console.log(`  ok    PNG icon is ${w}x${h}`);
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
