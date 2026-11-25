// Prueba de sincronización entre dos "dispositivos" contra un Supabase simulado (Auth + PostgREST mínimos).
// Uso: npm run build && node --import tsx tests/e2e/sync.ts
import { chromium, devices, type BrowserContext, type Route } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 4197;
const SUPA = 'https://mock.supabase.co';
type Row = { user_id: string; id: string; data: unknown; updated_at: number; deleted_at: number | null; server_updated_at: string };
const tables = new Map<string, Map<string, Row>>();
let clock = Date.parse('2026-01-01T00:00:00Z');
const users = new Map<string, { id: string; password: string }>();
const requests: string[] = [];

async function handle(route: Route) {
  const req = route.request();
  const url = new URL(req.url());
  requests.push(`${req.method()} ${url.pathname}`);
  const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/token') {
    const b = req.postDataJSON();
    if (url.searchParams.get('grant_type') === 'refresh_token') return json(200, session(b.refresh_token));
    if (url.pathname.endsWith('signup')) users.set(b.email, { id: `user-${users.size + 1}`, password: b.password });
    const u = users.get(b.email);
    if (!u || u.password !== b.password) return json(400, { error_description: 'Invalid login credentials' });
    return json(200, session(u.id, b.email));
  }
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
  const m = url.pathname.match(/^\/rest\/v1\/(gt_\w+)$/);
  if (!m) return json(404, { message: 'not found' });
  const user = (req.headers()['authorization'] ?? '').replace('Bearer token-', '');
  const t = tables.get(m[1]) ?? new Map<string, Row>();
  tables.set(m[1], t);
  if (req.method() === 'POST') {
    for (const r of req.postDataJSON() as Row[]) {
      assert.equal(r.user_id, user, 'RLS: user_id debe ser el del usuario autenticado');
      const key = `${r.user_id}/${r.id}`;
      const old = t.get(key);
      if (old && r.updated_at < old.updated_at) continue; // LWW como el trigger SQL
      t.set(key, { ...r, server_updated_at: new Date(clock += 1000).toISOString() });
    }
    return route.fulfill({ status: 201 });
  }
  const gt = url.searchParams.get('server_updated_at')?.replace(/^gt\./, '');
  const or = url.searchParams.get('or');
  let rows = [...t.values()].filter((r) => r.user_id === user);
  if (gt) rows = rows.filter((r) => r.server_updated_at > new Date(gt).toISOString());
  if (or) {
    const [, at, id] = or.match(/server_updated_at\.gt\.([^,]+),and\(server_updated_at\.eq\.[^,]+,id\.gt\.([^)]+)\)/)!;
    rows = rows.filter((r) => r.server_updated_at > at || (r.server_updated_at === at && r.id > id));
  }
  rows.sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at) || a.id.localeCompare(b.id));
  return json(200, rows.slice(0, Number(url.searchParams.get('limit') ?? 1000)));
}
function session(uid: string, email = 'x@x.es') {
  return { access_token: `token-${uid}`, refresh_token: uid, expires_in: 3600, user: { id: uid, email } };
}

const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
async function device(): Promise<BrowserContext> {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  ctx.setDefaultTimeout(8000);
  await ctx.route(`${SUPA}/**`, handle);
  return ctx;
}
async function connect(ctx: BrowserContext, mode: 'Crear cuenta' | 'Iniciar sesión') {
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}/?nosw#/settings`);
  await p.getByLabel('URL del proyecto').fill(SUPA);
  await p.getByLabel('Clave pública (anon key)').fill('anon');
  await p.getByRole('button', { name: 'Guardar conexión' }).click();
  await p.getByLabel('Email').fill('yo@example.com');
  await p.getByLabel('Contraseña').fill('contraseña-segura');
  await p.getByRole('button', { name: mode }).click();
  await p.getByText(/^Sincronizado/).first().waitFor();
  return p;
}
const ok: string[] = [];
try {
  // Dispositivo A: crea datos sin conexión configurada y después se conecta.
  const A = await device();
  const pa = await A.newPage();
  await pa.goto(`http://localhost:${PORT}/?nosw#/routines`);
  await pa.getByRole('button', { name: 'Nueva' }).click();
  await pa.getByPlaceholder('Nombre, por ejemplo A — Torso').fill('Rutina del móvil');
  await pa.getByRole('button', { name: 'Crear y añadir ejercicios' }).click();
  await pa.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await pa.getByPlaceholder('Buscar o escribir un nombre nuevo').fill('Hip thrust');
  await pa.getByRole('button', { name: /Crear «Hip thrust»/ }).click();
  await pa.locator('.sortable-item', { hasText: 'Hip thrust' }).waitFor();
  await pa.close();
  const pa2 = await connect(A, 'Crear cuenta');
  assert.ok([...tables.get('gt_routines')!.values()].some((r) => (r.data as { name: string }).name === 'Rutina del móvil'));
  assert.equal(tables.get('gt_exercises')!.size, 1);
  assert.equal(tables.get('gt_routine_exercises')!.size, 1);
  ok.push('A sube sus datos locales al crear la cuenta');

  // Dispositivo B: inicia sesión y descarga.
  const B = await device();
  const pb = await connect(B, 'Iniciar sesión');
  await pb.evaluate(() => { location.hash = '/routines'; });
  await pb.getByText('Rutina del móvil').waitFor();
  ok.push('B descarga las rutinas de A');

  // B renombra la rutina; A lo recibe al sincronizar.
  await pb.getByText('Rutina del móvil').click();
  const name = pb.getByLabel('Nombre de la rutina');
  await name.fill('Rutina renombrada en B');
  await name.blur();
  await pb.waitForTimeout(300);
  await pb.evaluate(() => { location.hash = '/settings'; });
  await pb.getByRole('button', { name: 'Sincronizar' }).click();
  await pb.getByText(/^Sincronizado/).first().waitFor();
  await pa2.getByRole('button', { name: 'Sincronizar' }).click();
  await pa2.getByText(/^Sincronizado/).first().waitFor();
  await pa2.evaluate(() => { location.hash = '/routines'; });
  await pa2.getByText('Rutina renombrada en B').waitFor();
  ok.push('Un cambio en B llega a A');

  // Borrado lógico: A borra el ejercicio; B deja de verlo.
  await pa2.evaluate(() => { location.hash = '/exercises'; });
  await pa2.getByText('Hip thrust').click();
  await pa2.getByRole('button', { name: 'Eliminar' }).click();
  await pa2.locator('.sheet').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await pa2.getByText('Catálogo vacío').waitFor();
  await pa2.evaluate(() => { location.hash = '/settings'; });
  await pa2.getByRole('button', { name: 'Sincronizar' }).click();
  await pa2.getByText(/^Sincronizado/).first().waitFor();
  await pb.getByRole('button', { name: 'Sincronizar' }).click();
  await pb.getByText(/^Sincronizado/).first().waitFor();
  await pb.evaluate(() => { location.hash = '/exercises'; });
  await pb.getByText('Catálogo vacío').waitFor();
  ok.push('Los borrados se propagan');

  // Sin cambios: una sincronización más no sube nada.
  const posts = requests.filter((r) => r.startsWith('POST /rest')).length;
  await pb.evaluate(() => { location.hash = '/settings'; });
  await pb.getByRole('button', { name: 'Sincronizar' }).click();
  await pb.getByText(/^Sincronizado/).first().waitFor();
  assert.equal(requests.filter((r) => r.startsWith('POST /rest')).length, posts);
  ok.push('Sin cambios pendientes no se vuelve a subir nada');
  console.log(ok.map((s) => `✔ ${s}`).join('\n'));
} catch (e) {
  console.log(ok.map((s) => `✔ ${s}`).join('\n'));
  console.error('✘', (e as Error).message.split('\n').slice(0, 4).join(' | '));
  for (const [k, t] of tables) console.error(k, [...t.values()].map((r) => JSON.stringify(r.data).slice(0, 120)));
  process.exitCode = 1;
  for (const c of browser.contexts()) for (const [i, pg] of c.pages().entries()) await pg.screenshot({ path: `/tmp/claude-0/shots/sync-fail-${browser.contexts().indexOf(c)}-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
}
