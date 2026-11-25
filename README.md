# GymTrack

Aplicación personal de seguimiento del entrenamiento de fuerza. PWA instalable en iPhone, Android y escritorio, que funciona sin conexión y sincroniza con Supabase cuando lo configuras.

Las decisiones técnicas y **todas las reglas de negocio** (secuencia de rutinas, validez de series, progresión, récords, calorías, sincronización) están en [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Qué incluye

- Rutinas ordenables (arrastrar o flechas) que forman una secuencia A → B → C → A.
- Catálogo de ejercicios con identidad única: renombrar o duplicar rutinas no rompe el historial.
- Registro serie a serie con peso, repeticiones, RIR/RPE, calentamiento y notas; valores de la sesión anterior como sugerencias atenuadas.
- Temporizador de descanso basado en marcas temporales (sobrevive a bloqueos de pantalla y cierres).
- Recuperación de entrenamientos interrumpidos, borradores y sesiones abandonadas.
- Historial editable (fechas, series, ejercicios, estado) con recálculo inmediato de todo lo derivado.
- Progreso por ejercicio: carga, repeticiones, volumen, 1RM estimado (Epley, marcado como estimación), récords separados por tipo y tendencia.
- Motor de doble progresión configurable con recomendaciones SUBIR / MANTENER / BAJAR explicadas y detección de estancamiento.
- Peso corporal con medias semanales, cambios por periodo y objetivo.
- Calorías como intervalo orientativo (MET × peso × tiempo).
- Exportación/importación JSON sin duplicados y sincronización opcional con Supabase.

## Requisitos

- Node.js 20 o superior.

## Ejecutar en local

```bash
npm install
npm run dev          # http://localhost:5173 con recarga al guardar
```

Para probar en el móvil durante el desarrollo, abre `http://<IP-de-tu-ordenador>:5173` desde la misma red Wi‑Fi. Ten en cuenta que el modo sin conexión y la instalación como app requieren HTTPS (ver Despliegue).

## Pruebas

```bash
npm test             # reglas de negocio (node:test): secuencia, progresión, métricas, calorías, temporizador, importación
npx playwright install chromium   # solo la primera vez
npm run test:e2e     # los 14 criterios de aceptación en un iPhone SE emulado (320 × 568)
npm run test:sync    # sincronización entre dos dispositivos contra un Supabase simulado
npm run typecheck    # TypeScript estricto
```

## Build

```bash
npm run build        # genera dist/ (HTML, JS, CSS, manifest, iconos y service worker)
npm run preview      # sirve dist/ en http://localhost:4173
```

## Despliegue (URL pública con HTTPS)

`dist/` es un sitio estático: sirve en cualquier hosting con HTTPS. Opciones gratuitas:

| Servicio | Pasos |
|---|---|
| **Cloudflare Pages** | Conecta el repositorio. Build command: `npm run build`. Output: `dist`. |
| **Netlify** | Igual: `npm run build`, carpeta `dist`. También puedes arrastrar la carpeta `dist` a app.netlify.com/drop. |
| **Vercel** | Framework «Other», build `npm run build`, output `dist`. |
| **GitHub Pages** | Publica el contenido de `dist` (la app usa rutas relativas, funciona en un subdirectorio). |

Cabeceras recomendadas: `sw.js` e `index.html` sin caché (`Cache-Control: no-cache`); `assets/*` con caché larga (los nombres llevan hash).

### Instalar en el iPhone

1. Abre la URL en **Safari**.
2. Toca Compartir → **Añadir a pantalla de inicio**.
3. Abre GymTrack desde el icono. Instalada, funciona sin conexión y Safari no borra sus datos por inactividad.

## Sincronización con Supabase (opcional)

Sin configurarla, los datos viven solo en el dispositivo (IndexedDB) y la app lo indica siempre con «Solo en este dispositivo».

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas, la seguridad por filas (cada usuario solo ve sus datos) y la regla «gana la versión más reciente».
3. En **Authentication → Providers**, deja activado Email. Si no quieres confirmar el email al registrarte, desactiva «Confirm email».
4. En **Project Settings → API**, copia la **Project URL** y la clave **anon public**.
5. En la app: Configuración → Sincronización → pega URL y clave → Crear cuenta / Iniciar sesión.

Alternativa: define las variables al compilar para no tener que pegarlas en cada dispositivo (crea un archivo `.env`):

```
GT_SUPABASE_URL=https://xxxx.supabase.co
GT_SUPABASE_ANON_KEY=eyJ...
```

La clave anon es pública por diseño; la protección de los datos la da la seguridad por filas del paso 2.

Funcionamiento: la app guarda primero en el dispositivo y sincroniza en segundo plano (al abrirla, al recuperar conexión, tras cada cambio y cada minuto). Los conflictos se resuelven por registro: gana la modificación más reciente. Las copias de seguridad de la base de datos dependen de tu plan de Supabase; la exportación JSON sigue disponible en cualquier caso.

## Estructura

```
src/domain/     Reglas de negocio puras (sin UI ni almacenamiento) — probadas en tests/unit
src/data/       IndexedDB, repositorio de operaciones, consultas, importación/exportación y sincronización
src/ui/         Pantallas y componentes React
supabase/       Esquema SQL del backend
scripts/        Build (esbuild), servidor de desarrollo, previsualización e iconos
tests/          Pruebas unitarias y de aceptación
docs/           Decisiones técnicas y reglas
```

## Limitaciones conocidas

- **Avisos en segundo plano**: Safari en iPhone no permite vibración desde la web ni ejecuta la app con la pantalla bloqueada. El sonido suena con la app abierta; al volver, el temporizador muestra cuánto hace que terminó. La opción «Mantener la pantalla encendida» evita el bloqueo durante el entreno.
- **Volumen y 1RM** en ejercicios con peso corporal o asistidos solo consideran la carga registrada.
- **Calorías**: estimación por METs, nunca una medición.
- La sincronización resuelve conflictos por registro completo (no fusiona campos dentro del mismo registro).
