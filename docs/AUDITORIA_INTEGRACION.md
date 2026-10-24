# Auditoría de integración — SYNAPSE

## Base revisada

- Frontend: `SYNAPSE_Rol1_Frontend_Completado_Limpio.zip`.
- Geoespacial: `SYNAPSE_Rol2_Geoespacial_Implementado.zip`, incorporando el dataset real OSM presente en el proyecto del integrante 1.
- IA: `SYNAPSE_Rol3_NVIDIA_Trabajo_Actualizado.zip`.
- Contrato: `docs/api-contracts.md`, versión 1.0.1.

## Rol 2

`src/lib/graph.ts`, `src/lib/simulator.ts`, `src/types/simulation.ts` y `src/lib/generated/dataset.ts` se mantuvieron idénticos a la base del frontend recibida. Se conservó su red OSM, sin sustituirla por la red sintética de los primeros ZIP. El endpoint `/api/simulate` solo recibió la corrección de `catch {` que indicó el equipo; sus rutas y respuestas permanecen iguales. Se añadieron scripts de preparación y pruebas del Rol 2, actualizados para Node16.

Los datos incorporados incluyen 675 nodos, 877 tramos, tres orígenes y seis casos comprobados. Los aniegos y cierres son hipotéticos; no son mapas oficiales de evacuación.

## Rol 3

Se verificó que los módulos de validación, fuentes y tipos coincidieran con el Rol 3 actualizado. `src/app/api/plan/route.ts` incorpora las configuraciones `runtime`, `dynamic` y `maxDuration` del entregable final. `src/lib/ai.ts` conserva NVIDIA Nemotron 3.5 Super VL, JSON validado, control de errores y 2 intentos; solo se simplificaron expresiones de «educativo» en los textos de presentación del plan. No se modificó el contrato JSON ni la selección de fuentes.

## Rol 1

Se conservó el dashboard y se ajustaron las etiquetas «Demo», los avisos sobre simulaciones y los textos de preparación. Se aplicó `fileURLToPath(import.meta.url)` a `tests/test_frontend_share.mjs`. Se conserva la función de compartir por enlace, WhatsApp, menú del dispositivo y tarjeta PNG. Se redujeron comentarios puramente visuales.

## Seguridad y publicación

El ZIP final excluye `.env.local`, `.git`, dependencias instaladas, archivos compilados y pruebas con credenciales. `.env.example` solo contiene un marcador de posición. No existen identidades de integrantes en la interfaz.

## Verificaciones ejecutadas

- TypeScript: sin errores.
- Compartición: 12 comprobaciones.
- Motor geoespacial: 197 afirmaciones y seis escenarios.
- GeoJSON y metadatos: validados con procedencia OSM.
- Importación OSM: comprobada con una muestra temporal sintética, sin sustituir el conjunto real.
- Rol 3: 55 afirmaciones con proveedor simulado.
- NVIDIA: 18 comprobaciones de integración y formato de solicitud.
- ESLint en `src`: sin errores.
- `next build`: no verificable en este entorno Linux por falta de acceso a la descarga del compilador nativo; ejecutar en Windows antes de publicar.
- Respuesta real de NVIDIA por HTTP en la aplicación unificada: pendiente de configuración local de `NVIDIA_API_KEY`.
