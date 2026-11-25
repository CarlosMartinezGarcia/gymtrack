# GymTrack — Decisiones técnicas y reglas de negocio

Este documento recoge las decisiones de arquitectura y **todas las reglas que afectan a la progresión o a la integridad del historial**. Si una regla cambia, se cambia aquí y en sus tests (`tests/unit`).

## 0. Punto de partida

No existía código previo: el proyecto se construye desde cero. No hay limitaciones heredadas que conservar.

## 1. Arquitectura

| Capa | Decisión | Motivo |
|---|---|---|
| Aplicación | PWA estática (React 19 + TypeScript), empaquetada con esbuild | Instalable desde Safari, sin servidor propio, despliegue en cualquier hosting HTTPS |
| Datos en el dispositivo | IndexedDB (envoltorio propio, `src/data/idb.ts`) | Persistente, transaccional, mucho más capacidad que localStorage, funciona offline |
| Backend | Supabase (Postgres + Auth) mediante su API REST, sin SDK | Autenticación, copia remota y sincronización entre dispositivos |
| Estrategia | **Local-first**: la app siempre lee y escribe en IndexedDB; la sincronización es un proceso aparte | El entrenamiento nunca depende de la cobertura del gimnasio |
| Offline | Service worker propio que precachea la app | Abrir y usar la app sin conexión |
| Lógica de negocio | Funciones puras en `src/domain/` sin dependencias de UI ni almacenamiento | Testeable y sustituible (p. ej. otro motor de progresión) |

Dependencias de ejecución: solo `react` y `react-dom`. El arrastrar y soltar, las gráficas (SVG), el acceso a IndexedDB y el cliente de Supabase están escritos en el propio proyecto para reducir dependencias y tamaño.

### Métricas derivadas

No se guardan estadísticas acumuladas. Volumen, récords, 1RM estimado, recomendaciones, secuencia y calorías **se recalculan siempre a partir de las series originales**. Por eso editar o borrar una sesión actualiza inmediatamente gráficas, récords y recomendaciones.

## 2. Modelo de datos

Todas las entidades tienen `id` (UUID generado en el cliente), `createdAt`, `updatedAt` (ms) y `deletedAt` (borrado lógico). El borrado lógico es necesario para que una eliminación se propague a otros dispositivos.

| Entidad | Contenido clave |
|---|---|
| `profile` | Preferencias: descanso por defecto, inicio automático del descanso, sonido, vibración, pantalla encendida, objetivo de peso |
| `exercises` | Ficha reutilizable: nombre, grupo muscular, tipo, unidad, incremento, rango de reps, series, descanso, configuración de progresión, notas |
| `routines` | Nombre, descripción, notas, `position` (orden = secuencia) |
| `routineExercises` | Ejercicio dentro de una rutina con sus parámetros propios (series, rango, incremento, descanso, progresión) y su orden |
| `sessions` | Sesión realizada: rutina (id + nombre copiado), inicio, fin, estado, `countsForSequence`, intensidad percibida, notas |
| `sessionExercises` | Ejercicio realizado en una sesión, con **copia** de los objetivos vigentes ese día |
| `sets` | Serie individual: sesión, ejercicio, orden, peso, reps, estado, RIR/RPE, calentamiento, valores sugeridos, notas |
| `bodyweights` | Peso corporal con su fecha y hora reales |

Reglas de integridad:

- **El historial de un ejercicio está ligado a su `id`**, nunca al nombre. Renombrar no afecta al historial. Un mismo ejercicio en varias rutinas comparte historial.
- **Duplicar una rutina** copia las filas `routineExercises` pero apunta a los mismos `exerciseId`: no se duplican ejercicios ni estadísticas.
- **Las sesiones copian los objetivos** (series, rango, incremento) al empezar. Modificar o borrar una rutina después **no altera** sesiones pasadas. La sesión también guarda el nombre de la rutina por si la rutina se borra.
- Borrar una sesión no borra la rutina ni el ejercicio. Borrar una rutina no borra sus sesiones. Borrar un ejercicio lo oculta del catálogo pero conserva su historial.
- Cada serie guarda por separado los **valores sugeridos** (`sugWeight`, `sugReps`) y los **realizados** (`weight`, `reps`). La interfaz muestra los sugeridos atenuados hasta que se confirman.

## 3. Validez de los datos

- **Serie válida**: estado `done`, no es de calentamiento, repeticiones > 0 y peso informado (0 está permitido para peso corporal).
- **Sesión válida**: estado `completed` y al menos una serie válida.
- Estados de sesión: `active` (en curso), `draft` (guardada sin terminar, se puede reanudar), `abandoned` (no cuenta para nada salvo el historial), `completed`.
- Borradores, sesiones abandonadas, series pendientes y series de calentamiento **nunca** cuentan para progresión, récords, volumen ni secuencia.

## 4. Secuencia de rutinas

1. El orden de la lista de rutinas es la secuencia (A → B → C → A…).
2. La rutina sugerida es la **siguiente a la de la última sesión válida que cuenta para la secuencia**, según el orden **actual** (si reordenas, se aplica en la siguiente recomendación).
3. No se usan días de la semana ni tiempo transcurrido.
4. Sin sesiones previas, se sugiere la primera rutina.
5. **Política para rutinas iniciadas manualmente**: si inicias la rutina sugerida, la sesión cuenta para la secuencia. Si inicias otra, la app pregunta «¿Continuar la secuencia desde esta rutina?» (por defecto **No**). Si respondes No, la sesión se guarda y cuenta para estadísticas y progresión, pero la siguiente sugerencia no cambia. Este indicador se puede cambiar después desde el historial.
6. Si la rutina de la última sesión ya no existe, se usa la sesión anterior cuya rutina siga existiendo.

## 5. Métricas

- **Volumen** = Σ (peso × repeticiones) de las series válidas. Limitación: en ejercicios con peso corporal o asistidos solo cuenta la carga registrada, por lo que el volumen no es comparable con el de ejercicios con carga externa ni entre ejercicios distintos.
- **1RM estimado (Epley)** = peso × (1 + reps / 30); con 1 repetición es el propio peso. Es una estimación: por encima de 10 repeticiones se marca como de baja fiabilidad y por encima de 12 no se calcula.
- **Récords** (separados, nunca mezclados): máxima carga, máximas repeticiones con cada carga, mejor 1RM estimado y mayor volumen de una sesión. Un récord de volumen no se presenta como mejora de fuerza.
- **Récord en una sesión**: supera el mejor valor de todas las sesiones válidas **anteriores** a su fecha. La primera vez que se hace un ejercicio no se considera récord.

## 6. Motor de progresión (doble progresión)

Configuración por ejercicio dentro de la rutina (heredada de la ficha): series objetivo, rango mín–máx, incremento, RIR objetivo opcional, sesiones para subir (`upSessions`, por defecto 1) y sesiones para bajar (`downSessions`, por defecto 2). Tipo `none` desactiva las recomendaciones.

Se evalúan las sesiones válidas del ejercicio, de la más reciente hacia atrás:

1. **Carga de trabajo** = la carga más alta de las series válidas de la sesión. Solo las series con esa carga («series de trabajo») cuentan para subir o bajar. Si hubo series con otras cargas, la explicación lo indica. Así una pirámide no equivale a una sesión con carga uniforme.
2. **Sesión consolidada**: al menos *N* series de trabajo (N = series objetivo) llegan al máximo del rango. Si hay RIR objetivo y las series de trabajo registran RIR (o RPE, convertido como RIR = 10 − RPE), el RIR medio no puede ser menor que el objetivo.
3. **Sesión fallida**: al menos ⌈N/2⌉ series de trabajo quedan por debajo del mínimo del rango.
4. **SUBIR**: las últimas `upSessions` sesiones válidas con la misma carga están consolidadas. Siguiente carga = carga + incremento; objetivo: mínimo del rango en todas las series.
5. **BAJAR**: las últimas `downSessions` sesiones válidas con la misma carga han fallado. Siguiente carga = carga − incremento (nunca por debajo de 0); objetivo: dentro del rango.
6. **MANTENER** en el resto de casos. Objetivo: misma carga, +1 repetición en las series que no llegaron al máximo. Si la sesión falló pero aún no se cumple `downSessions`, se avisa.
7. **Estancamiento** (aviso, no cambia la recomendación): 3 sesiones válidas seguidas con la misma carga sin consolidar y sin aumentar el total de repeticiones de las series de trabajo respecto a la primera de ellas.
8. Sin historial válido no hay recomendación.

Las recomendaciones son orientativas y se presentan siempre con su explicación; no son una verdad fisiológica. El motor es una función pura (`src/domain/progression.ts`) con interfaz estable: se puede sustituir sin tocar la pantalla de entrenamiento.

## 7. Calorías

Se usa la fórmula estándar MET × peso (kg) × horas con valores de referencia del Compendium of Physical Activities para entrenamiento de fuerza:

| Intensidad indicada | Rango MET |
|---|---|
| Sin indicar | 3,5 – 6,0 |
| Suave | 3,0 – 3,5 |
| Moderada | 3,5 – 5,0 |
| Intensa | 5,0 – 6,0 |

Se muestra siempre como **intervalo**. Se usa el peso corporal registrado más cercano anterior a la sesión (o el más próximo si no hay anterior). Sin ningún peso registrado se usa 70 kg y se marca como orientativo. No se usan series, repeticiones ni kilos levantados.

## 8. Temporizador de descanso

- El estado guarda marcas temporales (`endsAt` o `remainingMs` si está en pausa) en IndexedDB. El tiempo restante se calcula como `endsAt − ahora`, de modo que sobrevive a pestañas suspendidas, pantalla bloqueada y cierres.
- Al llegar a cero: aviso visual, sonido (Web Audio) y vibración si el navegador la admite.
- **Limitación honesta**: Safari en iPhone no admite la API de vibración y no ejecuta código con la app en segundo plano. La app no promete alertas con la pantalla bloqueada; al volver muestra «Descanso terminado hace X s». Se ofrece mantener la pantalla encendida (Wake Lock) durante el entrenamiento.

## 9. Sincronización

- Cada tabla local tiene su tabla remota `gt_<entidad>` con `id`, `user_id`, `data` (JSON), `updated_at` (ms del cliente), `deleted_at` y `server_updated_at`. Seguridad por filas (RLS): cada usuario solo ve sus filas.
- **Subida**: filas marcadas como pendientes (`dirty`). **Bajada**: filas con `server_updated_at` posterior al último cursor (con 5 s de solape; aplicar dos veces es inocuo).
- **Conflictos**: gana la versión con `updatedAt` más reciente (last-write-wins por registro), tanto en el cliente como en el servidor (trigger SQL). Al ser datos de una sola persona, los conflictos reales son raros.
- La app indica siempre el estado real: «Solo en este dispositivo», «Sincronizado a las…», «N cambios pendientes» o el error. Nunca dice que los datos están respaldados si no lo están.
- Para no duplicar datos entre dispositivos, el catálogo de ejercicios de ejemplo **no** se crea automáticamente: se ofrece con un botón.

## 10. Exportación e importación

- Exportación: un JSON con todas las tablas (incluidos borrados lógicos) y versión de formato.
- Importación: se valida la estructura y cada registro; se fusiona **por `id`** conservando la versión más reciente. Importar dos veces el mismo archivo no duplica nada. Se muestra un resumen antes de aplicar.

## 11. Prevención de errores

- Solo puede haber un entrenamiento activo: al iniciar otro, se ofrece reanudar el existente.
- Los botones de finalizar se bloquean mientras se guarda (evita dobles toques).
- El historial marca como «posible duplicado» las sesiones de la misma rutina iniciadas con menos de 10 minutos de diferencia.
- Toda eliminación pide confirmación.
- Se solicita almacenamiento persistente (`navigator.storage.persist`) y se muestra el resultado en Configuración.
- Safari puede borrar los datos de una web que no se usa durante 7 días **si no está instalada** en la pantalla de inicio; instalada, ese límite no aplica. Recomendación: instalarla y activar la sincronización o exportar copias.

## 12. Plan de ejecución

1. Dominio puro + tests (secuencia, métricas, récords, progresión, calorías, peso, temporizador, importación).
2. Capa de datos (IndexedDB, repositorio, sincronización) + SQL de Supabase.
3. Interfaz: inicio, entrenamiento + temporizador, rutinas y ejercicios, historial, progreso, peso, configuración.
4. PWA: manifest, iconos, service worker.
5. Verificación de los 14 criterios de aceptación en navegador con pantalla de iPhone.
