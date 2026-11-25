// Servidor de desarrollo con recarga al guardar: node scripts/dev.mjs  ->  http://localhost:5173
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { define } from './build.mjs';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, '.dev');
mkdirSync(dir, { recursive: true });
cpSync(join(root, 'public'), dir, { recursive: true });
writeFileSync(join(dir, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8')
  .replace('%JS%', 'assets/main.js').replace('%CSS%', 'assets/main.css')
  .replace('</body>', '<script>new EventSource("/esbuild").addEventListener("change", () => location.reload())</script></body>'));
// En desarrollo no hay service worker real.
writeFileSync(join(dir, 'sw.js'), 'self.addEventListener("install",()=>self.skipWaiting());');

const ctx = await esbuild.context({
  entryPoints: [join(root, 'src/main.tsx')], bundle: true, sourcemap: true, format: 'esm', jsx: 'automatic',
  outdir: join(dir, 'assets'), define: { ...define, 'process.env.NODE_ENV': '"development"' },
});
await ctx.watch();
const port = Number(process.env.PORT ?? 5173);
await ctx.serve({ servedir: dir, port, host: '0.0.0.0' });
console.log(`GymTrack en http://localhost:${port}`);
