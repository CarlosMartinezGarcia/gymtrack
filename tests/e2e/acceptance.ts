// Pruebas de aceptación (§17 de la especificación) en un iPhone pequeño emulado.
// Uso: npm run test:e2e   (requiere `npx playwright install chromium` la primera vez)
import { chromium, devices, type Page, type Locator } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 4199;
const BASE = `http://localhost:${PORT}/?nosw`;
const results: { n: number; name: string; ok: boolean; err?: string }[] = [];

const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone SE'], acceptDownloads: true }); // 320 × 568
ctx.setDefaultTimeout(8000);
let page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));

async function check(n: number, name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ n, name, ok: true }); }
  catch (e) { results.push({ n, name, ok: false, err: (e as Error).message.split('\n').slice(0, 6).join(' | ') }); await page.screenshot({ path: `tests/e2e/fail-${n}.png` }).catch(() => {}); }
}
async function noHorizontalScroll(p: Page, where: string) {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(w[0] <= w[1], `${where}: contenido más ancho que la pantalla (${w[0]} > ${w[1]})`);
}
const nav = (path: string) => page.evaluate((p) => { location.hash = p; }, path).then(() => page.waitForTimeout(150));
const card = (name: string) => page.locator('.ex').filter({ has: page.locator('h3', { hasText: new RegExp(`^${name}$`) }) });
async function skipRest() {
  const skip = page.getByRole('button', { name: 'Saltar' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}
async function logSet(c: Locator, n: number, kg: string, reps: string, complete = true) {
  await c.getByLabel(`peso serie ${n}`, { exact: true }).fill(kg);
  await c.getByLabel(`peso serie ${n}`, { exact: true }).press('Enter');
  await c.getByLabel(`repeticiones serie ${n}`, { exact: true }).fill(reps);
  await c.getByLabel(`repeticiones serie ${n}`, { exact: true }).press('Enter');
  if (complete) { await c.getByLabel(`Completar serie ${n}`).click(); await skipRest(); }
}
async function createRoutine(name: string, exercises: string[]) {
  await nav('/routines');
  await page.getByRole('button', { name: 'Nueva' }).click();
  await page.getByPlaceholder('Nombre, por ejemplo A — Torso').fill(name);
  await page.getByRole('button', { name: 'Crear y añadir ejercicios' }).click();
  for (const ex of exercises) {
    await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
    await page.getByPlaceholder('Buscar o escribir un nombre nuevo').fill(ex);
    await page.locator('.sheet .list-item', { hasText: new RegExp(`^${ex}`) }).first().click();
    await page.locator('.sortable-item', { hasText: ex }).first().waitFor();
  }
}
const finish = async () => {
  await page.getByRole('button', { name: 'Terminar' }).click();
  await page.getByRole('button', { name: 'Finalizar y ver resumen' }).click();
  await page.getByRole('heading', { name: 'Resumen' }).waitFor();
};
const routineOrder = () => page.locator('.list .sortable-item .grow > button > .grow > span:first-child').allTextContents();

try {
  await page.goto(BASE);
  await page.getByText('Crea tu primera rutina').waitFor();
  await nav('/exercises');
  await page.getByRole('button', { name: 'Añadir catálogo básico' }).click();
  await page.getByText('Press banca', { exact: true }).waitFor();

  await check(1, 'Crear una rutina con varios ejercicios y reordenarlos', async () => {
    await createRoutine('A — Torso', ['Press banca', 'Remo con barra', 'Press militar']);
    const names = () => page.locator('.sortable-item .grow .ellipsis').allTextContents();
    assert.deepEqual(await names(), ['Press banca', 'Remo con barra', 'Press militar']);
    await page.getByLabel('Bajar Press banca').click();
    await page.waitForTimeout(150);
    assert.deepEqual(await names(), ['Remo con barra', 'Press banca', 'Press militar']);
    // Arrastrar Press militar a la primera posición
    const handle = page.getByLabel('Arrastrar Press militar');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 16; i++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 14);
    await page.mouse.up();
    await page.waitForTimeout(200);
    assert.deepEqual(await names(), ['Press militar', 'Remo con barra', 'Press banca']);
    await noHorizontalScroll(page, 'editor de rutina');
    await createRoutine('B — Pierna', ['Sentadilla']);
    await createRoutine('C — Accesorios', ['Curl de bíceps']);
    await nav('/routines');
    assert.deepEqual(await routineOrder(), ['A — Torso', 'B — Pierna', 'C — Accesorios']);
  });

  await check(4, 'Registrar distintas cargas y repeticiones en cada serie', async () => {
    await nav('/');
    await page.getByRole('button', { name: /Empezar A — Torso/ }).click();
    await page.locator('.wk-head').waitFor();
    await page.getByRole('button', { name: /Press banca/ }).first().click();
    const pb = card('Press banca');
    await logSet(pb, 1, '60', '12');
    await logSet(pb, 2, '62,5', '10');
    await logSet(pb, 3, '62.5', '9');
    await pb.locator('.ex-done-count', { hasText: '3/3' }).waitFor();
    await noHorizontalScroll(page, 'entrenamiento');
  });

  await check(5, 'Añadir y eliminar series', async () => {
    const pb = card('Press banca');
    await pb.getByRole('button', { name: 'Añadir serie' }).click();
    await pb.getByLabel('Completar serie 4').waitFor();
    assert.equal(await pb.getByLabel('peso serie 4', { exact: true }).getAttribute('placeholder'), '62,5', 'la nueva serie sugiere la carga anterior');
    await pb.getByLabel('Más opciones serie 4').click();
    await page.getByRole('button', { name: 'Eliminar serie' }).click();
    await page.locator('.sheet').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await pb.getByLabel('Completar serie 4').count(), 0);
  });

  await check(9, 'Iniciar y completar un descanso hasta cero', async () => {
    const rm = card('Remo con barra');
    await rm.locator('.ex-head').click();
    await logSet(rm, 1, '50', '10', false);
    await rm.getByLabel('Completar serie 1').click();
    await page.getByRole('timer').waitFor();
    // Descanso por defecto 2:00; se ajusta para dejar 15 s de cuenta atrás real.
    await page.getByRole('button', { name: '+30 s' }).click(); // 2:00 + 0:30
    for (let i = 0; i < 9; i++) await page.getByRole('button', { name: '−15 s' }).click(); // quedan 15 s
    const clock = await page.locator('.rest-clock').textContent();
    assert.ok(clock === '0:15' || clock === '0:14', `reloj ${clock}`);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.rest-clock').textContent(), clock, 'en pausa no avanza');
    await page.getByRole('button', { name: 'Reanudar' }).click();
    await page.getByText('Descanso terminado').waitFor({ timeout: 18000 });
    assert.equal(await page.locator('.rest-clock').textContent(), '0:00');
    await page.getByRole('button', { name: 'Siguiente serie' }).click();
    assert.equal(await page.getByRole('timer').count(), 0);
  });

  await check(10, 'Interrumpir un entrenamiento y recuperar los datos', async () => {
    await page.reload();
    await page.getByText('Entrenamiento en curso').or(page.locator('.wk-head')).first().waitFor();
    await nav('/');
    await page.getByRole('button', { name: 'Continuar entrenamiento' }).click();
    const pb = card('Press banca');
    if (!(await pb.getByLabel('peso serie 1', { exact: true }).isVisible())) await pb.locator('.ex-head').click();
    assert.equal(await pb.getByLabel('peso serie 2', { exact: true }).inputValue(), '62,5');
    assert.equal(await pb.getByLabel('repeticiones serie 3', { exact: true }).inputValue(), '9');
    await finish();
  });

  await check(2, 'Completar A y comprobar que se sugiere B', async () => {
    await page.getByRole('button', { name: 'Volver a inicio' }).click();
    await page.getByRole('button', { name: /Empezar B — Pierna/ }).waitFor();
  });

  await check(3, 'Cerrar y reabrir la aplicación conserva los datos', async () => {
    await page.close();
    page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE);
    await page.getByRole('button', { name: /Empezar B — Pierna/ }).waitFor();
  });
} catch (e) {
  console.error('Fallo de preparación:', e);
}

// A partir de aquí se usa la página reabierta.
const P = () => page;
const navp = nav;
const cardp = card;
const checkp = check;
const openPressSession = async () => {
  await navp('/history');
  await P().locator('.list-item', { hasText: 'A — Torso' }).first().click();
  await P().locator('.ex-head', { hasText: 'Press banca' }).click();
};

await checkp(8, 'Las recomendaciones usan el historial correcto', async () => {
  await navp('/progress');
  await P().locator('.list-item', { hasText: 'Press banca' }).click();
  // 60×12, 62,5×10, 62,5×9: solo 2 series con la carga máxima -> MANTENER 62,5
  await P().locator('.rec .badge', { hasText: 'MANTENER' }).waitFor();
  assert.match(await P().locator('.rec').textContent() ?? '', /62,5 kg/);
  assert.match(await P().locator('.rec').textContent() ?? '', /otras cargas/i);
});

await checkp(6, 'Corregir una sesión histórica actualiza gráficas y recomendaciones', async () => {
  await navp('/progress');
  await P().locator('.list-item', { hasText: 'Press banca' }).click();
  const before = await P().locator('.chart').first().innerHTML();
  await openPressSession();
  const c = cardp('Press banca');
  for (const [n, kg, reps] of [[1, '62,5', '12'], [2, '62,5', '12'], [3, '62,5', '12']] as const) {
    await c.getByLabel(`peso serie ${n}`, { exact: true }).fill(kg); await c.getByLabel(`peso serie ${n}`, { exact: true }).press('Enter');
    await c.getByLabel(`repeticiones serie ${n}`, { exact: true }).fill(reps); await c.getByLabel(`repeticiones serie ${n}`, { exact: true }).press('Enter');
  }
  await navp('/progress');
  await P().locator('.list-item', { hasText: 'Press banca' }).click();
  await P().locator('.rec .badge', { hasText: 'SUBIR' }).waitFor();
  assert.match(await P().locator('.rec').textContent() ?? '', /65 kg/);
  assert.notEqual(await P().locator('.chart').first().innerHTML(), before, 'la gráfica cambia');
});

await checkp(7, 'Eliminar una sesión duplicada sin borrar la rutina', async () => {
  await navp('/history');
  await P().locator('.list-item', { hasText: 'A — Torso' }).first().click();
  await P().getByRole('button', { name: 'Repetir como nuevo entrenamiento' }).click();
  const choice = P().getByRole('button', { name: /No, la siguiente seguirá siendo/ });
  if (await choice.isVisible().catch(() => false)) await choice.click();
  await P().locator('.wk-head').waitFor();
  const pb = cardp('Press banca');
  if (!(await pb.getByLabel('Completar serie 1').isVisible())) await pb.locator('.ex-head').click();
  await pb.getByLabel('Completar serie 1').click();
  const skip = P().getByRole('button', { name: 'Saltar' }); if (await skip.isVisible().catch(() => false)) await skip.click();
  await P().getByRole('button', { name: 'Terminar' }).click();
  await P().getByRole('button', { name: 'Finalizar y ver resumen' }).click();
  await P().getByRole('heading', { name: 'Resumen' }).waitFor();
  await navp('/history');
  assert.equal(await P().getByText('Posible duplicado').count(), 2);
  await P().locator('.list-item', { hasText: 'A — Torso' }).first().click();
  await P().getByRole('button', { name: 'Eliminar sesión' }).click();
  await P().locator('.sheet').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await P().getByRole('heading', { name: 'Historial' }).waitFor();
  assert.equal(await P().locator('.list-item', { hasText: 'A — Torso' }).count(), 1);
  assert.equal(await P().getByText('Posible duplicado').count(), 0);
  await navp('/routines');
  assert.ok((await P().locator('.sortable-item', { hasText: 'A — Torso' }).count()) === 1, 'la rutina sigue existiendo');
});

await checkp(13, 'Renombrar un ejercicio conserva su historial', async () => {
  await navp('/exercises');
  await P().locator('.list-item', { hasText: /^Press banca/ }).click();
  await P().getByLabel('Nombre').fill('Press banca plano');
  await P().getByRole('button', { name: 'Guardar', exact: true }).click();
  await P().waitForTimeout(200);
  await navp('/progress');
  await P().locator('.list-item', { hasText: 'Press banca plano' }).click();
  await P().getByText('1 sesión válida').waitFor();
  await P().locator('.rec .badge', { hasText: 'SUBIR' }).waitFor();
});

await checkp(14, 'Modificar una rutina no altera sesiones pasadas', async () => {
  await navp('/routines');
  await P().locator('.sortable-item', { hasText: 'A — Torso' }).locator('.grow > button').click();
  await P().locator('.sortable-item', { hasText: 'Remo con barra' }).locator('.grow > button').click();
  await P().getByLabel('Series', { exact: true }).fill('5');
  await P().getByRole('button', { name: 'Guardar', exact: true }).click();
  await P().locator('.sortable-item', { hasText: 'Press militar' }).locator('.grow > button').click();
  await P().getByRole('button', { name: 'Quitar de la rutina' }).click();
  await P().locator('.sheet').getByRole('button', { name: 'Quitar', exact: true }).click();
  await P().waitForTimeout(200);
  assert.match(await P().locator('.sortable-item', { hasText: 'Remo con barra' }).textContent() ?? '', /5 × 6–10/);
  await navp('/history');
  await P().locator('.list-item', { hasText: 'A — Torso' }).first().click();
  await P().locator('.ex-head', { hasText: 'Press militar' }).waitFor();
  assert.match(await P().locator('.ex-head', { hasText: 'Remo con barra' }).textContent() ?? '', /3 × 6–10/);
});

await checkp(12, 'Exportar e importar sin duplicar', async () => {
  await navp('/settings');
  const [dl] = await Promise.all([P().waitForEvent('download'), P().getByRole('button', { name: 'Exportar datos (JSON)' }).click()]);
  const path = await dl.path();
  const json = JSON.parse(readFileSync(path!, 'utf8'));
  assert.equal(json.format, 'gymtrack-backup');
  const countBefore = (json.data.sessions as unknown[]).length;
  await P().locator('input[type=file]').setInputFiles(path!);
  await P().getByText('Sin cambios (ya existen)').waitFor();
  assert.equal(await P().getByRole('button', { name: 'No hay nada nuevo que importar' }).isDisabled(), true);
  await P().locator('.sheet .btn.ghost, .backdrop').first().press('Escape');
  const [dl2] = await Promise.all([P().waitForEvent('download'), P().getByRole('button', { name: 'Exportar datos (JSON)' }).click()]);
  const json2 = JSON.parse(readFileSync((await dl2.path())!, 'utf8'));
  assert.equal(json2.data.sessions.length, countBefore, 'mismo número de sesiones');
});

await checkp(11, 'Funciona en una pantalla pequeña de iPhone (320 × 568)', async () => {
  for (const path of ['/', '/routines', '/exercises', '/history', '/progress', '/weight', '/settings']) {
    await navp(path);
    await noHorizontalScroll(P(), path);
  }
  await navp('/weight');
  await P().getByLabel('Peso (kg)').fill('80,4');
  await P().getByRole('button', { name: 'Guardar' }).click();
  await P().getByText('80,4 kg').first().waitFor();
  await navp('/');
  await P().screenshot({ path: 'tests/e2e/home-iphone-se.png' });
  assert.deepEqual(errors, [], 'sin errores de JavaScript');
});

await browser.close();
server.kill();
results.sort((a, b) => a.n - b.n);
for (const r of results) console.log(`${r.ok ? '✔' : '✘'} ${String(r.n).padStart(2)}. ${r.name}${r.err ? `\n     ${r.err}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} criterios verificados`);
process.exit(failed ? 1 : 0);
