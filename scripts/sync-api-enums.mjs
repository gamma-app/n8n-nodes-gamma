#!/usr/bin/env node
// Regenerates nodes/Gamma/apiEnums.ts from Gamma's published API documentation.
//
// Two sources, deliberately cross-checked against each other:
//   * the OpenAPI schema embedded in the endpoint docs -> the authoritative
//     set of accepted VALUES
//   * the human reference tables -> display NAMES and credit costs
//
// Run `npm run sync:enums` to refresh, or `npm run sync:enums -- --check` to
// fail when the committed output is stale (used in CI).

import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = new URL('../nodes/Gamma/apiEnums.ts', import.meta.url);
const DOCS = 'https://developers.gamma.app';
const SRC = {
	spec: `${DOCS}/generations/create-generation.md`,
	models: `${DOCS}/reference/image-model-accepted-values.md`,
	languages: `${DOCS}/reference/output-language-accepted-values.md`,
};

const check = process.argv.includes('--check');

async function get(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url} -> ${r.status}`);
	return await r.text();
}

/** Pull the embedded OpenAPI JSON out of a docs page. */
function extractSpec(md) {
	const start = md.indexOf('{"openapi"');
	if (start === -1) throw new Error('no OpenAPI block found in the docs page');
	// Walk braces to find the matching close, ignoring braces inside strings.
	let depth = 0, inStr = false, esc = false;
	for (let i = start; i < md.length; i++) {
		const c = md[i];
		if (esc) { esc = false; continue; }
		if (c === '\\') { esc = true; continue; }
		if (c === '"') { inStr = !inStr; continue; }
		if (inStr) continue;
		if (c === '{') depth++;
		else if (c === '}' && --depth === 0) return JSON.parse(md.slice(start, i + 1));
	}
	throw new Error('unbalanced OpenAPI block');
}

/** Parse every markdown table row as [col0, col1, ...]. */
function tableRows(md) {
	return md.split('\n')
		.filter((l) => l.trim().startsWith('|'))
		.map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
		.filter((cells) => cells.length >= 2 && !/^-+$/.test(cells[0].replace(/[\s-]/g, '') || '-'))
		.filter((cells) => !/^-+$/.test(cells[1]));
}

const unbacktick = (s) => s.replace(/`/g, '').trim();
// n8n's linter sorts option names with localeCompare; match it exactly.
const byName = (a, b) => a.name.localeCompare(b.name);

const [specMd, modelsMd, langsMd] = await Promise.all([get(SRC.spec), get(SRC.models), get(SRC.languages)]);
const spec = extractSpec(specMd);
const schemas = spec.components.schemas;

const enumOf = (path) => {
	const v = path.split('.').reduce((o, k) => o?.[k], schemas);
	if (!Array.isArray(v)) throw new Error(`no enum at ${path}`);
	return v;
};

const specEnums = {
	imageModel: enumOf('ImageModel.enum'),
	imageSource: enumOf('ImageOptions.properties.source.enum'),
	language: enumOf('TextOptions.properties.language.enum'),
	textAmount: enumOf('TextOptions.properties.amount.enum'),
	textMode: enumOf('Generation.properties.textMode.enum'),
	format: enumOf('Generation.properties.format.enum'),
	cardSplit: enumOf('Generation.properties.cardSplit.enum'),
	exportAs: enumOf('Generation.properties.exportAs.enum'),
	dimensions: enumOf('CardOptions.properties.dimensions.enum'),
	workspaceAccess: enumOf('SharingOptions.properties.workspaceAccess.enum'),
	externalAccess: enumOf('SharingOptions.properties.externalAccess.enum'),
	emailAccess: enumOf('EmailOptions.properties.access.enum'),
};

// --- image models: names + credits from the reference tables ----------------
const modelRows = tableRows(modelsMd)
	.filter((c) => c.length === 3 && /^`[a-z0-9.\-]+`$/i.test(c[1]))
	.map(([name, key, credits]) => ({ name, value: unbacktick(key), credits: credits.trim() }));

const unknownModels = modelRows.filter((m) => !specEnums.imageModel.includes(m.value));
if (unknownModels.length) {
	throw new Error(`model table lists values absent from the OpenAPI enum: ${unknownModels.map((m) => m.value).join(', ')}`);
}
// The spec enum is a superset: it also carries video models, which aren't
// valid for imageOptions.model. Only ship what the image table documents.
const modelsOnlyInSpec = specEnums.imageModel.filter((v) => !modelRows.some((m) => m.value === v));

const IMAGE_MODELS = [
	{ name: 'Auto (Let Gamma Choose)', value: '', description: 'Let Gamma pick a model' },
	...modelRows.map((m) => ({ name: m.name, value: m.value, description: `${m.credits} credits per image` })).sort(byName),
];

// --- languages ---------------------------------------------------------------
const langRows = tableRows(langsMd)
	.filter((c) => c.length === 2 && /^`[a-z\-0-9]+`$/i.test(c[1]))
	.map(([name, key]) => ({ name, value: unbacktick(key) }));

const unknownLangs = langRows.filter((l) => !specEnums.language.includes(l.value));
if (unknownLangs.length) {
	throw new Error(`language table lists codes absent from the OpenAPI enum: ${unknownLangs.map((l) => l.value).join(', ')}`);
}
// n8n requires the node interface to be English only, and its linter requires
// Title Case. Gamma names the two Japanese variants with Japanese script
// ("Japanese (\u3060/\u3067\u3042\u308b style)" / "Japanese (\u3067\u3059/\u307e\u3059 style)"), which is the plain vs
// polite verb form. Render those in English; everything else passes through.
const NAME_OVERRIDES = {
	ja: 'Japanese (Polite Style)',
	'ja-da': 'Japanese (Plain Style)',
};
const LANGUAGES = langRows
	.map((l) => ({ name: NAME_OVERRIDES[l.value] ?? l.name, value: l.value }))
	.sort(byName);

// --- dimensions valid per format (from the Warnings reference) ---------------
// Not machine-readable in the spec, so this stays a curated map; the assertion
// below keeps it honest against the spec's overall dimension enum.
const DIMENSIONS_BY_FORMAT = {
	presentation: ['16x9', '4x3', 'fluid'],
	document: ['pageless', 'letter', 'a4', 'fluid'],
	social: ['1x1', '4x5', '9x16'],
	webpage: ['fluid'],
};
const DIMENSION_LABELS = {
	'16x9': '16:9 (Widescreen)', '4x3': '4:3 (Standard)', '1x1': '1:1 (Square)',
	'4x5': '4:5 (Portrait)', '9x16': '9:16 (Vertical)', a4: 'A4', letter: 'Letter',
	fluid: 'Fluid (Auto-Adjust)', pageless: 'Pageless',
};
for (const [fmt, dims] of Object.entries(DIMENSIONS_BY_FORMAT)) {
	if (!specEnums.format.includes(fmt)) throw new Error(`unknown format ${fmt}`);
	for (const d of dims) {
		if (!specEnums.dimensions.includes(d)) throw new Error(`unknown dimension ${d} for ${fmt}`);
		if (!DIMENSION_LABELS[d]) throw new Error(`no label for dimension ${d}`);
	}
}

const opts = (arr) => arr.map((o) =>
	`\t{ name: ${JSON.stringify(o.name)}, value: ${JSON.stringify(o.value)}${o.description ? `, description: ${JSON.stringify(o.description)}` : ''} },`
).join('\n');

const dimOpts = (fmt) => DIMENSIONS_BY_FORMAT[fmt]
	.map((d) => ({ name: DIMENSION_LABELS[d], value: d }))
	.sort(byName);

const out = `// GENERATED FILE -- do not edit by hand.
// Run \`npm run sync:enums\` to regenerate from Gamma's published API docs.
// Sources:
//   ${SRC.spec}
//   ${SRC.models}
//   ${SRC.languages}
//
// Options are pre-sorted by name to satisfy n8n's node linter.
import type { INodePropertyOptions } from 'n8n-workflow';

/** Image models valid for imageOptions.model, with credit cost as subtext. */
export const IMAGE_MODEL_OPTIONS: INodePropertyOptions[] = [
${opts(IMAGE_MODELS)}
];

/** Output languages for textOptions.language. */
export const LANGUAGE_OPTIONS: INodePropertyOptions[] = [
${opts(LANGUAGES)}
];

/** Accepted values for imageOptions.source. */
export const IMAGE_SOURCE_VALUES = ${JSON.stringify([...specEnums.imageSource].sort())} as const;

/** Accepted values for exportAs. */
export const EXPORT_AS_VALUES = ${JSON.stringify([...specEnums.exportAs].sort())} as const;

/** Card dimensions accepted by each format. Invalid pairs are overridden by the
 *  API with a warning, so the node only offers the valid ones. */
export const CARD_DIMENSION_OPTIONS: Record<string, INodePropertyOptions[]> = {
${Object.keys(DIMENSIONS_BY_FORMAT).map((f) => `\t${f}: [\n${dimOpts(f).map((o) => `\t\t{ name: ${JSON.stringify(o.name)}, value: ${JSON.stringify(o.value)} },`).join('\n')}\n\t],`).join('\n')}
};

/** Image-model values the spec accepts but the image-model reference table does
 *  not document (video models). Kept for drift visibility, not offered in the UI. */
export const UNDOCUMENTED_MODEL_VALUES = ${JSON.stringify(modelsOnlyInSpec.sort())} as const;
`;

const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
if (check) {
	if (prev !== out) {
		console.error('apiEnums.ts is stale. Run `npm run sync:enums` and commit the result.');
		process.exit(1);
	}
	console.log(`apiEnums.ts is up to date (${IMAGE_MODELS.length - 1} models, ${LANGUAGES.length} languages).`);
} else {
	writeFileSync(OUT, out);
	console.log(`wrote apiEnums.ts: ${IMAGE_MODELS.length - 1} image models, ${LANGUAGES.length} languages, ` +
		`${specEnums.imageSource.length} image sources, ${specEnums.exportAs.length} export formats`);
	if (modelsOnlyInSpec.length) console.log(`  (${modelsOnlyInSpec.length} spec-only model values not offered: ${modelsOnlyInSpec.join(', ')})`);
	if (prev && prev !== out) console.log('  content changed');
}
