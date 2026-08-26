#!/usr/bin/env node
// Prints the CHANGELOG.md section for a version, for use as GitHub release notes.
//
//   node scripts/changelog-section.mjs 0.3.0
//
// Exits non-zero if the version has no section, so a release cannot silently
// ship with empty notes.
import { readFileSync } from 'node:fs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
	console.error('usage: changelog-section.mjs <version>');
	process.exit(2);
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lines = changelog.split('\n');

// Section headings look like `## [0.3.0] - 2026-08-25` or `## [Unreleased]`.
const isHeading = (line) => /^##\s+\[/.test(line);
const start = lines.findIndex((l) => isHeading(l) && l.includes(`[${version}]`));

if (start === -1) {
	console.error(`No CHANGELOG section found for ${version}.`);
	console.error('Add a "## [<version>] - <date>" section before tagging.');
	process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex(isHeading);
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

if (!body) {
	console.error(`The CHANGELOG section for ${version} is empty.`);
	process.exit(1);
}

console.log(body);
