const { src, dest, parallel } = require('gulp');

// encoding: false is required. Gulp 5 reads files as utf8 by default, which
// silently corrupts binaries -- it turned the 60x60 PNG icon into 7KB of
// mojibake. Harmless for SVG, fatal for PNG.
const ICONS = '**/*.{png,svg}';
const binary = { encoding: false };

function buildNodeIcons() {
  return src(`nodes/${ICONS}`, binary).pipe(dest('dist/nodes'));
}

function buildCredentialIcons() {
  return src(`credentials/${ICONS}`, binary).pipe(dest('dist/credentials'));
}

const buildIcons = parallel(buildNodeIcons, buildCredentialIcons);

exports['build:icons'] = buildIcons;
exports.default = buildIcons;

