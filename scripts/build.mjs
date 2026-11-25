// Build de producción: node scripts/build.mjs  ->  dist/
// Variables opcionales (también en un archivo .env): GT_SUPABASE_URL, GT_SUPABASE_ANON_KEY
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist');
const env = loadEnv();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = `${pkg.version}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;

export const define = {
  __SUPABASE_URL__: JSON.stringify(env.GT_SUPABASE_URL ?? ''),
  __SUPABASE_ANON_KEY__: JSON.stringify(env.GT_SUPABASE_ANON_KEY ?? ''),
  __APP_VERSION__: JSON.stringify(version),
  'process.env.NODE_ENV': '"production"',
};

if (import.meta.url === `file://${process.argv[1]}`) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [join(root, 'src/main.tsx')],
    bundle: true, minify: true, sourcemap: true, format: 'esm', target: ['safari15', 'chrome100', 'firefox100'],
    jsx: 'automatic', outdir: join(out, 'assets'), entryNames: '[name]-[hash]', metafile: true, define, legalComments: 'none',
  });
  const outputs = Object.keys(result.metafile.outputs).map((p) => relative(out, join(root, p)));
  const js = outputs.find((p) => p.endsWith('.js'));
  const css = outputs.find((p) => p.endsWith('.css'));
  writeFileSync(join(out, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8').replace('%JS%', js).replace('%CSS%', css));
  cpSync(join(root, 'public'), out, { recursive: true });
  const assets = ['./', ...walk(out).filter((f) => !f.endsWith('.map')).map((f) => './' + relative(out, f))];
  const sw = readFileSync(join(root, 'src/sw.template.js'), 'utf8').replace('__VERSION__', version).replace('__ASSETS__', JSON.stringify(assets.filter((a) => a !== './sw.js'), null, 1));
  writeFileSync(join(out, 'sw.js'), sw);
  const kb = (f) => (statSync(join(out, f)).size / 1024).toFixed(0);
  console.log(`GymTrack ${version} -> dist/  (js ${kb(js)} KB, css ${kb(css)} KB)${env.GT_SUPABASE_URL ? ', Supabase preconfigurado' : ''}`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
function loadEnv() {
  const e = { ...process.env };
  const f = join(root, '.env');
  if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && e[m[1]] === undefined) e[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return e;
}
