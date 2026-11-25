# GymTrack — Contexto del proyecto

Documento de referencia para el proyecto Prime 2027. Resume qué es GymTrack, cómo está construida, qué reglas sigue y cómo se trabaja en ella. Si algo de aquí contradice al código del repositorio, manda el repositorio.

## 1. Datos rápidos

| Campo | Valor |
|---|---|
| Qué es | App personal de seguimiento del entrenamiento de fuerza (PWA) |
| Usuario | Carlos, uso personal, principalmente desde iPhone (Safari, instalada en pantalla de inicio) |
| Estado | v1.0.0 terminada el 12/10/2026. Cumple los 14 criterios de aceptación de la especificación |
| Repositorio | `<pendiente: URL de GitHub>` |
| URL publicada | `<pendiente: https://xxxx.netlify.app>` |
| Hosting | Netlify (sitio estático). Build: `npm run build`. Carpeta publicada: `dist` |
| Backend | Supabase opcional (Auth + Postgres). `<pendiente: indicar si está activado>` |
| Idioma de la app y del código | Español (textos, comentarios y documentación) |

## 2. Qué hace

- **Rutinas** ordenables (arrastrar o flechas). Su orden es la secuencia de entrenamiento A → B → C → A.
- **Catálogo de ejercicios** con identidad única: renombrar un ejercicio o duplicar una rutina no rompe el historial.
- **Entrenamiento en curso**: registro serie a serie (peso, repeticiones, RIR/RPE, calentamiento, notas). Los valores de la sesión anterior aparecen como sugerencias atenuadas, separados de los valores realizados.
- **Temporizador de descanso** basado en marcas temporales: sobrevive a la pantalla bloqueada y a cierres de la app.
- **Recuperación**: entrenamientos interrumpidos, borradores y sesiones abandonadas.
- **Historial editable**: fechas, series, ejercicios y estado. Todo lo derivado se recalcula.
- **Progreso por ejercicio**: carga, repeticiones, volumen, 1RM estimado, récords por tipo, tendencia y gráficas por periodo.
- **Motor de progresión** (doble progresión) con recomendaciones SUBIR / MANTENER / BAJAR explicadas y aviso de estancamiento.
- **Peso corporal**: registros, medias semanales, cambio por periodo y objetivo.
- **Calorías**: intervalo orientativo, nunca un dato exacto.
- **Datos**: exportación/importación JSON sin duplicados y sincronización opcional con Supabase.

Secciones: Inicio, Entrenamiento en curso, Rutinas (y Ejercicios), Historial, Progreso, Peso, Configuración.

## 3. Arquitectura

| Capa | Decisión |
|---|---|
| Interfaz | React 19 + TypeScript, empaquetado con esbuild (`scripts/build.mjs`). Sin Vite |
| Dependencias de ejecución | Solo `react` y `react-dom`. IndexedDB, cliente de Supabase (REST), arrastrar y soltar y gráficas SVG están escritos en el propio proyecto |
| Datos | **Local-first**: la app siempre lee y escribe en IndexedDB; la sincronización es un proceso aparte |
| Offline | Service worker propio generado en el build (`src/sw.template.js` → `dist/sw.js`) |
| Navegación | Router por hash (`#/history/<id>`), compatible con hosting estático |
| Estilo | Tema oscuro. Colores con significado: azul = acción principal, verde = subir, rojo = bajar, amarillo = récord |

### Mapa de archivos

```
src/domain/        Reglas de negocio puras (sin UI ni almacenamiento)
  types.ts         Modelo de datos
  validity.ts      Qué serie/sesión es válida; historial por ejercicio
  sequence.ts      Siguiente rutina de la secuencia; reordenación
  progression.ts   Motor SUBIR / MANTENER / BAJAR
  metrics.ts       Volumen, 1RM (Epley), récords, PR de sesión, tendencia
  calories.ts      Estimación por METs
  bodyweight.ts    Medias semanales y cambios de peso
  timer.ts         Temporizador por marcas temporales
  backup.ts        Formato de copia, validación y fusión por id
  duplicates.ts    Detección de posibles sesiones duplicadas
src/data/
  idb.ts           Envoltorio de IndexedDB (transacciones multi-tabla)
  store.ts         Caché en memoria + escritura persistente; marca de pendiente de sincronizar
  queries.ts       Consultas derivadas (todo se recalcula)
  actions.ts       Operaciones de escritura (las del entrenamiento van en serie)
  backupIO.ts      Exportar/importar
  sync.ts          Sincronización con Supabase (push/pull, last-write-wins)
src/ui/            App.tsx, screens/*, components/*, styles.css, restTimer.ts, startFlow.ts
supabase/schema.sql   Tablas gt_*, seguridad por filas y trigger last-write-wins
scripts/           build.mjs, dev.mjs, serve.mjs, icons.mjs
tests/unit/        Reglas de negocio (node:test)
tests/e2e/         acceptance.ts (14 criterios, iPhone SE emulado), sync.ts (2 dispositivos, Supabase simulado)
docs/DECISIONES.md Decisiones técnicas y reglas de negocio (fuente de verdad de las reglas)
```

## 4. Modelo de datos

Todas las entidades tienen `id` (UUID), `createdAt`, `updatedAt` (ms) y `deletedAt` (borrado lógico, necesario para propagar borrados entre dispositivos).

Entidades: `profile`, `exercises`, `routines`, `routineExercises`, `sessions`, `sessionExercises`, `sets`, `bodyweights`.

Reglas de integridad:
- El historial de un ejercicio va ligado a su `id`, nunca al nombre.
- Duplicar una rutina copia sus filas `routineExercises` pero apunta a los mismos ejercicios.
- Cada sesión copia los objetivos vigentes al empezar: modificar o borrar una rutina no altera sesiones pasadas.
- Borrar una sesión no borra la rutina ni el ejercicio. Borrar un ejercicio lo oculta pero conserva su historial.
- Cada serie guarda por separado los valores sugeridos (`sugWeight`, `sugReps`) y los realizados (`weight`, `reps`).
- No se guardan estadísticas acumuladas: volumen, récords, recomendaciones, secuencia y calorías se recalculan siempre desde las series.

## 5. Reglas de negocio (resumen de docs/DECISIONES.md)

**Validez**
- Serie válida: estado hecha, no calentamiento, reps > 0 y peso informado (0 permitido).
- Sesión válida: completada y con al menos una serie válida.
- Borradores, abandonadas, series pendientes y calentamientos no cuentan para progresión, récords, volumen ni secuencia.

**Secuencia de rutinas**
- La siguiente rutina es la que sigue a la última sesión válida que cuenta para la secuencia, según el orden actual.
- No usa días de la semana ni tiempo transcurrido. Sin sesiones, sugiere la primera.
- Si se inicia una rutina distinta a la sugerida, la app pregunta «¿Continuar la secuencia desde esta rutina?» (por defecto No). Se puede cambiar después desde el historial.

**Progresión (doble progresión)**
- Carga de trabajo = la carga más alta de la sesión. Solo esas series cuentan para subir o bajar.
- SUBIR: en las últimas `upSessions` (1 por defecto) sesiones con esa carga, al menos N series (N = series objetivo) llegan al máximo del rango y, si hay RIR objetivo, el RIR medio no es menor. Siguiente carga = carga + incremento.
- BAJAR: en las últimas `downSessions` (2 por defecto) sesiones con esa carga, al menos ⌈N/2⌉ series quedan por debajo del mínimo. Siguiente carga = carga − incremento.
- MANTENER en el resto: misma carga, +1 rep en las series que no llegaron al máximo.
- Estancamiento (solo aviso): 3 sesiones con la misma carga sin consolidar y sin aumentar las reps de trabajo.
- RPE se convierte a RIR como 10 − RPE.

**Métricas**
- Volumen = Σ peso × reps de series válidas (en peso corporal/asistido solo cuenta la carga añadida).
- 1RM Epley = peso × (1 + reps/30); con 1 rep es el peso; >10 reps baja fiabilidad; >12 no se calcula.
- Récords separados: máxima carga, máximas reps por carga, mejor 1RM estimado, mayor volumen de sesión. La primera sesión de un ejercicio no genera récords.

**Calorías**: MET × kg × horas, siempre como intervalo. MET: sin indicar 3,5–6,0; suave 3,0–3,5; moderada 3,5–5,0; intensa 5,0–6,0. Peso corporal: el registro más cercano anterior a la sesión; sin registros, 70 kg y se marca como orientativo. Menos de 1 minuto no se estima.

**Sincronización**: cada tabla local tiene su tabla remota `gt_<entidad>` con RLS por usuario. Sube registros marcados como pendientes y baja por cursor `server_updated_at`. Conflictos: gana el `updatedAt` más reciente, por registro completo. La app nunca dice que los datos están respaldados si no lo están.

**Importación**: fusión por `id`, conservando la versión más reciente. Importar dos veces no duplica.

**Otras**: un solo entrenamiento activo a la vez; posible duplicado = misma rutina iniciada con menos de 10 min de diferencia; toda eliminación pide confirmación.

## 6. Comandos

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 37 pruebas de reglas de negocio
npm run test:e2e     # 14 criterios de aceptación (requiere: npx playwright install chromium)
npm run test:sync    # sincronización entre dos dispositivos (Supabase simulado)
npm run typecheck
npm run build        # genera dist/
npm run preview      # sirve dist/ en http://localhost:4173
```

## 7. Despliegue en Netlify

- Configuración: build command `npm run build`, publish directory `dist`, Node 20 o superior.
- Recomendado: Netlify conectado al repositorio de GitHub, con despliegue automático al hacer push a `main` y previsualizaciones para cada pull request.
- Cabeceras: `index.html` y `sw.js` sin caché; `assets/*` con caché larga (los nombres llevan hash). Se pueden fijar con un `netlify.toml` (pendiente de añadir).
- Supabase preconfigurado (opcional): variables de entorno `GT_SUPABASE_URL` y `GT_SUPABASE_ANON_KEY` en Netlify.
- Tras desplegar, el service worker actualiza la app la siguiente vez que se abre.

## 8. Forma de trabajar en mejoras

1. Toda mejora parte del código actual del repositorio, no de este documento.
2. Si un cambio afecta a la progresión, la secuencia, la validez de los datos o la integridad del historial, se documenta la regla en `docs/DECISIONES.md` y se añade o ajusta su test.
3. La lógica nueva va en `src/domain/` como función pura con tests; la UI solo la consume.
4. Antes de dar un cambio por bueno: `npm test`, `npm run typecheck`, `npm run build` y, si toca pantallas, `npm run test:e2e`.
5. Un cambio = una rama + pull request; Netlify genera una previsualización; al fusionar en `main` se publica.
6. Nunca cambiar el formato de datos sin migración: los datos del usuario viven en su iPhone.
7. Mantener la app usable con una mano, en pantallas de 320 px y sin conexión.

## 9. Limitaciones conocidas

- Safari en iPhone no permite vibración desde la web ni avisos con la pantalla bloqueada. Al volver se muestra cuánto hace que terminó el descanso; existe la opción de mantener la pantalla encendida.
- Volumen y 1RM en peso corporal/asistido solo consideran la carga registrada.
- Calorías: estimación por METs, no medición.
- La sincronización resuelve conflictos por registro completo.
- La comprobación de tipos de la interfaz no se ejecutó con dependencias reales al construirla: conviene pasar `npm run typecheck` tras el primer `npm install`.
- La sincronización se probó contra un Supabase simulado, no contra uno real.

## 10. Pendientes y posibles mejoras

- [ ] Subir el código a GitHub y conectar Netlify al repositorio.
- [ ] Añadir `netlify.toml` con build y cabeceras de caché.
- [ ] Ejecutar `npm run typecheck` con dependencias instaladas y corregir lo que salga.
- [ ] Decidir si se activa Supabase y probar la sincronización real entre iPhone y ordenador.
- [ ] Añadir integración continua (GitHub Actions) que ejecute tests y build en cada pull request.
- [ ] Ideas de mejora (sin priorizar): plantillas de calentamiento automático, notas de técnica visibles durante la serie, comparación entre rutinas, exportación CSV, recordatorio de pesaje.
