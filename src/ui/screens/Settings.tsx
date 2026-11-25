import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data/queries';
import { updateProfile } from '../../data/actions';
import { downloadBackup, previewImport, applyImport, type ImportPreview } from '../../data/backupIO';
import * as Sync from '../../data/sync';
import { clearAll } from '../../data/idb';
import { dirtyCount, loadAll } from '../../data/store';
import { useData, useSync, back } from '../hooks';
import { attempt, choose, confirm, Sheet, toast } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { syncText } from '../components/SyncChip';
import { beep, canVibrate, unlockAudio } from '../restTimer';
import { fmtRest } from '../format';

export function Settings() {
  useData();
  const p = profile();
  const up = (patch: Parameters<typeof updateProfile>[0]) => attempt(() => updateProfile(patch));
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string>('');
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
    navigator.storage?.estimate?.().then((e) => setUsage(e.usage ? `${(e.usage / 1024 / 1024).toFixed(1)} MB usados` : '')).catch(() => {});
  }, []);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/')}><Icon name="chevL" /> Inicio</button></div>
      <h1>Configuración</h1>

      <div className="section-title">Entrenamiento</div>
      <div className="card">
        <label className="switch"><span>Iniciar descanso al completar una serie</span><input type="checkbox" checked={p.autoStartRest} onChange={(e) => up({ autoStartRest: e.target.checked })} /></label>
        <label className="switch"><span>Sonido al terminar el descanso</span><input type="checkbox" checked={p.sound} onChange={(e) => up({ sound: e.target.checked })} /></label>
        <label className="switch"><span>Vibración<br /><span className="tiny muted">{canVibrate() ? 'Disponible en este navegador' : 'No disponible en este navegador (Safari en iPhone no la admite)'}</span></span>
          <input type="checkbox" checked={p.vibration} disabled={!canVibrate()} onChange={(e) => up({ vibration: e.target.checked })} /></label>
        <label className="switch"><span>Mantener la pantalla encendida durante el entreno</span><input type="checkbox" checked={p.keepAwake} onChange={(e) => up({ keepAwake: e.target.checked })} /></label>
        <div className="switch"><span>Descanso por defecto en ejercicios nuevos</span>
          <select className="input" style={{ width: 110 }} value={p.defaultRestSec} onChange={(e) => up({ defaultRestSec: Number(e.target.value) })}>
            {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => <option key={s} value={s}>{fmtRest(s)}</option>)}
          </select></div>
        <button className="btn sm" onClick={() => { unlockAudio(); setTimeout(() => { if (!beep()) toast('El navegador no permite reproducir sonido.', true); }, 50); }}>Probar sonido</button>
        <p className="tiny muted" style={{ marginTop: 10 }}>Los avisos funcionan con la app abierta. Con la pantalla bloqueada o la app en segundo plano, el navegador no garantiza el sonido; al volver verás cuánto hace que terminó el descanso.</p>
      </div>

      <SyncSection />

      <div className="section-title">Copias de seguridad</div>
      <div className="card stack">
        <button className="btn block" onClick={downloadBackup}>Exportar datos (JSON)</button>
        <ImportButton />
        <p className="tiny muted">La importación fusiona por identificador: importar el mismo archivo dos veces no duplica datos y nunca sobrescribe un registro con una versión más antigua.</p>
      </div>

      <div className="section-title">Almacenamiento en este dispositivo</div>
      <div className="card small">
        <div className="kv"><span>Base de datos</span><span>IndexedDB{usage ? `, ${usage}` : ''}</span></div>
        <div className="kv"><span>Almacenamiento persistente</span><span>{persisted == null ? 'Desconocido' : persisted ? 'Concedido' : 'No concedido'}</span></div>
        <div className="kv"><span>App instalada</span><span>{standalone ? 'Sí' : 'No'}</span></div>
        {!standalone && <p className="notice blue" style={{ marginTop: 10 }}>En iPhone: abre esta web en Safari, toca Compartir y elige «Añadir a pantalla de inicio». Instalada, Safari no borra los datos por inactividad y funciona sin conexión.</p>}
        {persisted === false && <button className="btn sm" style={{ marginTop: 10 }} onClick={async () => setPersisted(await navigator.storage.persist())}>Solicitar almacenamiento persistente</button>}
      </div>

      <div className="section-title">Zona de peligro</div>
      <div className="card">
        <button className="btn danger block" onClick={async () => {
          const pending = dirtyCount();
          const v = await choose('Borrar todos los datos de este dispositivo', [{ label: 'Borrar datos del dispositivo', value: true, kind: 'danger' }],
            <>Se borrarán rutinas, ejercicios, sesiones y pesos de este dispositivo.{Sync.getUser() ? (pending ? ` Hay ${pending} cambios sin subir a la nube que se perderán.` : ' La copia en la nube no se borra.') : ' No hay copia en la nube: exporta antes si quieres conservarlos.'}</>, 'BORRAR');
          if (v) { await clearAll(); await loadAll(); location.reload(); }
        }}>Borrar datos del dispositivo</button>
      </div>
      <p className="tiny faint center" style={{ marginTop: 20 }}>GymTrack {__APP_VERSION__}</p>
    </div>
  );
}
declare const __APP_VERSION__: string;

function SyncSection() {
  const st = useSync();
  const cfg = Sync.getConfig();
  const user = Sync.getUser();
  const [url, setUrl] = useState(cfg?.url ?? '');
  const [key, setKey] = useState(cfg?.anonKey ?? '');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const { text, dot } = syncText(st);
  const run = async (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); await attempt(fn, ok); setBusy(false); };

  const login = async (mode: 'in' | 'up') => {
    const prev = await Sync.previousAccountId();
    if (prev && dirtyCount() > 0 && !(await confirm('Iniciar sesión con otra cuenta', 'Los datos de este dispositivo se subirán a la cuenta con la que inicies sesión.', 'Continuar', false))) return;
    await run(async () => {
      if (mode === 'in') { await Sync.signIn(email, pass); toast('Sesión iniciada'); }
      else {
        const r = await Sync.signUp(email, pass);
        toast(r === 'confirm-email' ? 'Revisa tu email para confirmar la cuenta y después inicia sesión.' : 'Cuenta creada');
      }
      setPass('');
    });
  };

  return (
    <>
      <div className="section-title">Sincronización y copia en la nube</div>
      <div className="card stack">
        <div className="row"><span className={`dot ${dot}`} /><b className="grow">{text}</b>{user && <button className="btn sm" disabled={busy || st.kind === 'syncing'} onClick={() => run(() => Sync.syncNow())}>Sincronizar</button>}</div>
        {st.kind === 'error' && <p className="small" style={{ color: 'var(--red)' }}>{st.message}</p>}
        {st.kind === 'local' && <p className="small muted">Tus datos se guardan solo en este dispositivo. Para tener copia en la nube y usar varios dispositivos, conecta tu proyecto de Supabase (instrucciones en el README).</p>}

        {!cfg ? (
          <>
            <label className="field"><span>URL del proyecto</span><input className="input" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoCapitalize="off" autoCorrect="off" /></label>
            <label className="field"><span>Clave pública (anon key)</span><input className="input" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="off" autoCorrect="off" /></label>
            <button className="btn block" disabled={busy || !url || !key} onClick={() => run(() => Sync.saveConfig({ url, anonKey: key }), 'Proyecto configurado')}>Guardar conexión</button>
          </>
        ) : !user ? (
          <>
            <p className="small muted">Proyecto: {cfg.url}</p>
            <label className="field"><span>Email</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field"><span>Contraseña</span><input className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
            <div className="row">
              <button className="btn primary grow" disabled={busy || !email || !pass} onClick={() => login('in')}>Iniciar sesión</button>
              <button className="btn grow" disabled={busy || !email || !pass} onClick={() => login('up')}>Crear cuenta</button>
            </div>
            <button className="btn ghost sm" onClick={() => run(() => Sync.saveConfig(null))}>Cambiar proyecto</button>
          </>
        ) : (
          <>
            <div className="kv small"><span>Cuenta</span><span className="ellipsis">{user.email}</span></div>
            <div className="kv small"><span>Cambios pendientes de subir</span><span>{dirtyCount()}</span></div>
            <button className="btn block" onClick={async () => {
              const n = dirtyCount();
              if (n && !(await confirm('Cerrar sesión', `Hay ${n} cambios sin subir. Se conservarán en este dispositivo y se subirán cuando vuelvas a iniciar sesión.`, 'Cerrar sesión', false))) return;
              await run(() => Sync.signOut(), 'Sesión cerrada');
            }}>Cerrar sesión</button>
          </>
        )}
      </div>
    </>
  );
}

function ImportButton() {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  return (
    <>
      <input ref={ref} type="file" accept="application/json,.json" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setPreview(previewImport(await f.text()));
      }} />
      <button className="btn block" onClick={() => ref.current?.click()}>Importar copia</button>
      {preview && (
        <Sheet title="Importar copia" onClose={() => setPreview(null)}>
          {!preview.ok ? <p style={{ color: 'var(--red)' }}>{preview.error}</p> : (
            <>
              <p className="small muted">Copia del {preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('es-ES') : 'fecha desconocida'}.</p>
              <div className="card small" style={{ marginBottom: 12 }}>
                <div className="kv"><span>Registros nuevos</span><span>{preview.plan.added}</span></div>
                <div className="kv"><span>Registros más recientes que los actuales</span><span>{preview.plan.updated}</span></div>
                <div className="kv"><span>Sin cambios (ya existen)</span><span>{preview.plan.unchanged}</span></div>
              </div>
              {preview.warnings.map((w, i) => <p key={i} className="notice small">{w}</p>)}
              <button className="btn primary block" disabled={preview.plan.added + preview.plan.updated === 0}
                onClick={async () => { const plan = preview.plan; if (await attempt(() => applyImport(plan), 'Copia importada')) setPreview(null); }}>
                {preview.plan.added + preview.plan.updated ? 'Importar' : 'No hay nada nuevo que importar'}
              </button>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
