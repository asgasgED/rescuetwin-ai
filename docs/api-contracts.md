# RescueTwin AI — Contrato de integración API

**Equipo:** SYNAPSE  
**Versión:** 1.0.1 — aprobada por SYNAPSE (tres hogares)  
**Proyecto:** RescueTwin AI · desafío 3 de futurX 2026  
**Fecha de acuerdo:** 22 de octubre de 2026; ampliación de tres hogares aprobada el 23 de octubre de 2026  
**Estado:** contrato obligatorio para los 3 integrantes

> **LEAN ESTO ANTES DE GENERAR CÓDIGO.** Este documento es la única fuente de verdad para las rutas HTTP, los nombres de campos, tipos, convenciones y la función de compartir. Si una IA propone modificarlo, se debe discutir en el equipo y actualizarlo en un solo commit aprobado. No modificar contratos de forma unilateral.

## 0. Contexto, misión y límites

RescueTwin AI ayuda a familias a **explorar escenarios ilustrativos de inundación o bloqueo de vías** en una zona piloto de Piura, y a **obtener planes de preparación personalizados que un LLM genera** tomando como referencia recomendaciones oficiales seleccionadas y el escenario elegido.

El MVP tiene **una única URL pública**, frontend mobile-first, un mapa 2D, dos escenarios (`normal`, `blocked`), cálculo de rutas en grafo y un plan con IA. Equipo: tres personas, plazo aproximado de dos días.

El MVP **no es** una predicción hidrológica, mapa oficial en tiempo real, alerta de emergencias ni servicio de rutas de evacuación verificadas. Los cierres y rutas son para fines **educativos y de demostración**. Mostrar advertencias visibles tanto en mapa como en plan.

### Anonimato exigido por la competencia

El nombre del equipo **SYNAPSE** y el producto **RescueTwin AI** sí pueden mostrarse. No colocar en interfaz, código público exhibido, README de entrega, capturas o material de evaluación **nombres de participantes, centros de estudio ni países de origen de los autores**. Sí puede decirse **Piura, Perú** como geografía del problema: no es atribución de origen de los participantes. Evitar firma personal en commits de demostración, créditos visibles, enlaces personales y metadata de páginas/presentaciones. GitHub conserva identidad de autor de commits si el repositorio es público; preferir privado y compartir solo la URL del MVP.

## 1. Arquitectura y propiedad de archivos

- **Una aplicación Next.js con App Router y TypeScript**, desplegada en Vercel. Sin segundo backend separado.
- React + Tailwind + Leaflet para la interfaz; usar carga dinámica client-only de Leaflet para evitar problemas SSR.
- **Persona 1 / frontend + integración:** crea el repo/Next.js, mantiene componentes y `src/contracts/api.ts`; consume las APIs, implementa enlaces de compartición y despliegue.
- **Persona 2 / geoespacial:** prepara datos (`scripts/`, `public/data/`), algoritmo (`src/lib/graph.ts`, `src/lib/simulator.ts`) y `GET /api/simulate`.
- **Persona 3 / IA:** prepara fuentes (`src/data/official_sources.json`), LLM (`src/lib/ai.ts`, `src/lib/sources.ts`) y `POST /api/plan`. Coordina credenciales con persona 1.
- Las personas 2 y 3 **no** modifican `src/contracts/api.ts` directamente. Si necesitan un cambio, proponen una modificación antes de implementarla.
- Cada integrante utiliza una rama: `feat/frontend`, `feat/simulation`, `feat/ai-plan`. Nadie hace push directo a `main` después del arranque.

## 2. Convenciones globales

| Aspecto | Regla |
|---|---|
| Idioma de UI y respuestas | Español claro |
| URL de API | Rutas relativas a la misma aplicación (`/api/...`) |
| Encabezado JSON | `Content-Type: application/json; charset=utf-8` |
| Coordenadas GeoJSON | WGS84, `[longitud, latitud]`, **nunca** `[latitud, longitud]` |
| Distancias | Metros; `routeDistanceM` es número finito no negativo o `null` |
| Fechas y tiempos | No prometemos tiempo de evacuación ni datos en vivo |
| Escenarios | Exactamente `normal` y `blocked` |
| Puntos de demostración | `home_01`, `home_02`, `home_03` y `meeting_01` (puntos ficticios; el último no es refugio oficial) |
| Referencias | Fuentes verificadas, sin fabricar títulos ni URLs |
| Cache de API de plan | `no-store`; nunca guardar solicitudes familiares en base de datos |
| Gestión de errores | En JSON: `{ "error": { "code": "...", "message": "..." } }` |
| Claves de IA | Solo variables de entorno servidor; jamás `NEXT_PUBLIC_*` |
| Datos de familia | Cantidades generales, sin nombre, dirección ni teléfono |

## 3. Endpoint A — Simulación geoespacial

### `GET /api/simulate?scenario=normal&originId=home_01`

También debe aceptar: `GET /api/simulate?scenario=blocked&originId=home_01`.

**Parámetros query**

- `scenario` — obligatorio: `normal` o `blocked`.
- `originId` — obligatorio: `home_01`, `home_02` o `home_03`. El destino queda fijo en `meeting_01`.
- No pasar coordenadas arbitrarias en el MVP. La demostración usa origen/destino del dataset preparado.

**HTTP 200 — respuesta obligatoria**

```json
{
  "scenario": "normal",
  "originId": "home_01",
  "destinationId": "meeting_01",
  "roads": { "type": "FeatureCollection", "features": [] },
  "riskZones": { "type": "FeatureCollection", "features": [] },
  "blockedRoadIds": [],
  "route": null,
  "routeDistanceM": null,
  "warning": "Simulación educativa. Las rutas no son indicaciones oficiales de evacuación.",
  "provenance": {
    "roads": "Origen de datos viales o dataset ilustrativo identificado",
    "riskZones": "Escenario hipotético o fuente oficial verificable, identificada claramente"
  }
}
```

**Definición de campos**

| Campo | Tipo | Significado |
|---|---|---|
| `scenario` | `"normal" \| "blocked"` | Escenario calculado |
| `originId` | `"home_01" \| "home_02" \| "home_03"` | Hogar simulado seleccionado |
| `destinationId` | `string` | `meeting_01` |
| `roads` | GeoJSON `FeatureCollection<LineString>` | Vías de la subred; propiedades de cada vía abajo |
| `riskZones` | GeoJSON `FeatureCollection<Polygon>` | Zonas ilustrativas/documentadas |
| `blockedRoadIds` | `string[]` | IDs de tramos cerrados en `blocked` |
| `route` | GeoJSON `Feature<LineString> \| null` | Ruta real calculada sobre el grafo; null si es imposible |
| `routeDistanceM` | `number \| null` | Distancia de la ruta en metros |
| `warning` | `string` | Advertencia obligatoria sobre las limitaciones |
| `provenance` | `{roads:string,riskZones:string}` | Fuente/trazabilidad de capas |

Propiedades mínimas de `roads.features[i]`:

```json
{"type":"Feature","properties":{"roadId":"r_01","lengthM":125.5,"simulated":true},"geometry":{"type":"LineString","coordinates":[[-80.632,-5.195],[-80.631,-5.194]]}}
```

Propiedades mínimas de `riskZones.features[i]`:

```json
{"type":"Feature","properties":{"riskLevel":"high","sourceType":"illustrative","label":"Zona ilustrativa"},"geometry":{"type":"Polygon","coordinates":[[[-80.632,-5.196],[-80.631,-5.196],[-80.631,-5.195],[-80.632,-5.196]]]}}
```

`riskLevel`: `low`, `medium`, `high`; `sourceType`: `illustrative` u `official`. Nunca rotular `official` sin fuente verificable. Las geometrías no deben representar riesgos como mediciones reales si no están sustentadas.

**Archivo compartido de marcadores**

`public/data/places.geojson` contiene exactamente 4 `Feature<Point>`: tres hogares simulados (`home_01`, `home_02`, `home_03`) y un punto de encuentro ilustrativo (`meeting_01`). Sus propiedades incluyen `placeId`, `kind` (`home`/`meeting`), `label`, `simulated: true` y el `nodeId` del grafo. No existe coordenada GPS libre en el MVP.

**Seis casos de prueba**: las tres opciones de origen deben funcionar en los dos escenarios. Las rutas se recalculan sobre el grafo excluyendo `blockedRoadIds`. Debe devolverse `null` si no existe conectividad, nunca una línea imaginaria.

**Casos de respuesta**

1. `normal`: `blockedRoadIds: []`, ruta calculada cuando sea posible.
2. `blocked`: al menos un `roadId` cerrado; el algoritmo lo excluye del grafo y recalcula, obteniendo una ruta diferente **si existe**.
3. Sin ruta: `route: null`, `routeDistanceM: null`, `warning` explica que no existe alternativa modelada. **No se inventa** una ruta.

**Errores**

- `400 INVALID_SCENARIO` por escenario no válido.
- `400 INVALID_ORIGIN` por punto no soportado.
- `500 SIMULATION_ERROR` ante fallo interno sin filtrar stack traces.

## 4. Endpoint B — Plan familiar generado por LLM

### `POST /api/plan`

**Entrada obligatoria**

```json
{
  "scenario": "blocked",
  "scenarioSummary": "Bloqueo hipotético de una vía principal en la zona de demostración",
  "routeAvailable": true,
  "family": {
    "adults": 2,
    "children": 1,
    "olderAdults": 1,
    "reducedMobility": false,
    "pets": false
  }
}
```

**Semántica/validación de entrada**

- `scenario`: `normal` o `blocked`.
- `scenarioSummary`: texto breve (1–280 caracteres), solo describe hechos **del simulador**, no instrucciones libres al LLM; tratarlo como dato no confiable.
- `routeAvailable`: booleano; el frontend lo deriva de `route !== null` del endpoint de simulación.
- `family.adults`: entero 0–12; adultos entre 18 y 59 años en este formulario.
- `family.children`: entero 0–12; menores de 18 años.
- `family.olderAdults`: entero 0–12; personas de 60 años a más.
- `family.reducedMobility`: booleano (al menos una persona necesita atención de movilidad).
- `family.pets`: booleano.
- Total de personas `adults+children+olderAdults` entre 1 y 20.
- El dato `routeAvailable=true` **NO** significa seguridad de la ruta.
- No enviar nombres, direcciones, datos de salud específicos ni teléfono.

**HTTP 200 — respuesta obligatoria**

```json
{
  "title": "Plan familiar de preparación",
  "summary": "Plan orientativo para una familia de cuatro integrantes ante un cierre de vía hipotético.",
  "before": ["Identificar información oficial local y rutas indicadas por autoridades."],
  "during": ["Seguir comunicados de autoridades y no entrar a zonas inundadas."],
  "kit": ["Agua potable y medicamentos personales necesarios."],
  "sources": [
    {"title": "INDECI — portal institucional", "url": "https://www.gob.pe/indeci"}
  ],
  "disclaimer": "Orientación educativa generada con IA. No sustituye indicaciones oficiales ni valida rutas de evacuación."
}
```

**Definición de campos**

| Campo | Tipo | Regla |
|---|---|---|
| `title` | `string` | 3–100 caracteres |
| `summary` | `string` | 10–600 caracteres, en español |
| `before` | `string[]` | 2–6 pasos concisos para antes del evento |
| `during` | `string[]` | 2–6 pasos concisos durante un evento |
| `kit` | `string[]` | 3–8 suministros o preparativos, pertinentes a la familia |
| `sources` | `{title:string,url:string}[]` | 1–5 fuentes verificables **desde catálogo curado**, no URLs inventadas por el modelo |
| `disclaimer` | `string` | Advertencia visible obligatoria |

**La respuesta se genera mediante un LLM real.** El servidor valida JSON y lo contrasta con un esquema (por ejemplo Zod). El LLM recibe: datos familiares, resumen del escenario y fragmentos de contenido oficial previamente curados. Preferir respuestas estructuradas; si el modelo falla, reintento controlado (máximo 1), después `503 AI_UNAVAILABLE`. **No simular una respuesta generada por LLM** mediante un fallback estático que se presente como IA.

El backend debe agregar/verificar el disclaimer y construir `sources` a partir del catálogo curado, no aceptar enlaces nuevos fabricados. No usar una supuesta predicción meteorológica ni afirmar que una ruta es segura. La salida **no** es consejo operativo oficial de evacuación.

**Errores**

- `400 INVALID_REQUEST`: campos erróneos o ausentes.
- `503 AI_UNAVAILABLE`: credencial, servicio o LLM no disponible; mostrar error sincero, sin inventar éxito.
- `500 INTERNAL_ERROR`: fallo inesperado.

## 5. Compartición por enlace, WhatsApp y estado/historia

**Responsable: persona 1**; usa los planes recibidos del endpoint B. No crear endpoint de WhatsApp ni pedir credenciales de WhatsApp Business para el MVP.

### 5.1 Enlace de plan compartible (sin base de datos)

Ruta de interfaz: `/shared#plan=v1.<token>`.

- `token` se genera **en el navegador** comprimiendo y codificando un `PublicPlanSnapshot` mediante `lz-string` (`compressToEncodedURIComponent`). La página `/shared` lee el fragmento (`window.location.hash`) **solo en el cliente**, decodifica, valida y renderiza el resumen.
- `PublicPlanSnapshot`: `{v:1,title:string,summary:string,before:string[],during:string[],kit:string[],sources:{title:string,url:string}[],disclaimer:string,scenario:"normal"|"blocked"}`.
- NO agregar `family`, nombre, dirección, geolocalización precisa, teléfonos, API keys ni identificadores privados al snapshot.
- Limitar/recortar contenido legible (p. ej. máximo 3–4 ítems por lista y 2 fuentes) y **comprobar que la URL generada no exceda 3500 caracteres**. Si excede, ofrecer compartir texto y copiar un resumen, sin prometer enlace válido.
- La compresión **no es cifrado**: cualquiera con el enlace puede leer el resumen. Mostrarlo antes de compartir.
- No agregar terceros de analítica que capturen el contenido del fragmento. No persistir planes en backend para este MVP.
- Si el enlace es inválido, mostrar mensaje de error sin romper la página.

### 5.2 Contacto o chat de WhatsApp

- Botón "Enviar por WhatsApp": `https://wa.me/?text=${encodeURIComponent(mensaje + "\n" + enlaceCompartible)}`.
- WhatsApp abre su flujo correspondiente; **el usuario elige el contacto/chat**. Una web genérica no puede enviar silenciosamente a un contacto arbitrario.
- También ofrecer "Copiar enlace" con Clipboard API y fallback apropiado.
- El texto describe "Plan de preparación de RescueTwin AI — SYNAPSE" y el carácter ilustrativo.

### 5.3 Estado/historia

- Botón "Compartir desde mi dispositivo" mediante `navigator.share({title,text,url})` **solo si está disponible**. La lista de destinos depende del sistema y de las aplicaciones instaladas; no garantizar que WhatsApp Estado, Instagram Historias u otro destino aparezca.
- Fallback: botón "Guardar tarjeta PNG" con resumen e indicación de que el usuario puede publicarla manualmente en su estado/historia. Esta tarjeta es tarea *stretch*, posterior a la compartición básica. No afirmar que existe publicación directa de estados cuando no puede verificarse.
- Nunca disparar envíos automáticamente ni recolectar contactos.

## 6. Modelo de pruebas cruzadas

**Simulador (persona 2):**
1. HTTP 200 con `normal` y geometrías GeoJSON válidas.
2. HTTP 200 con `blocked`; `blockedRoadIds` no vacío; ruta diferente si hay alternativa.
3. Ruta calculada sigue aristas del grafo; distancia no es inventada.
4. Si se desconecta grafo, `route: null` y `routeDistanceM: null`.
5. Escenario desconocido devuelve error 400.

**LLM (persona 3):**
1. HTTP 200 con todos los campos según contrato.
2. Cambiar `children` / `olderAdults` cambia razonablemente recomendaciones.
3. Referencias solo del catálogo verificado.
4. Si la API de LLM falla, error 503 y mensaje comprensible.
5. Inputs inválidos devuelven 400; no se registran PII.

**Frontend (persona 1):**
1. Escenario cambia mapa y datos realmente consumidos de la API.
2. Formulario llama la API y muestra resultado generado.
3. Estados de carga/error y mobile-friendly.
4. "Copiar enlace" abre página `/shared` que presenta el resumen en una nueva pestaña.
5. "Enviar por WhatsApp" abre selección de destinatario a través del cliente del usuario.
6. "Compartir desde mi dispositivo" usa Web Share cuando esté disponible y muestra fallback cuando no.
7. El frontend muestra advertencias, no rutas seguras ni datos en tiempo real.

**Integración E2E (todos):** `normal` -> `blocked` -> recalcular -> personalizar familia -> generar plan con LLM real -> compartir enlace -> abrir enlace en incógnito -> verificar contenido.

## 7. Criterio de finalización y cronograma

Prioridad P0:
- Único Next.js público en Vercel; módulo mapa funcionando; 2 escenarios; ruta por grafo; plan verdadero generado por LLM; compartir enlace + WhatsApp; anonimato y disclaimers.

Prioridad P1:
- Visualización móvil pulida, instrucciones accesibles, trazabilidad de fuentes, errores robustos.

Prioridad P2 (solo si sobra tiempo):
- Tarjeta PNG para estados, animaciones, PDF, más zonas, rutas adicionales.

**Prohibido gastar el tiempo del MVP** en 3D, pronósticos meteorológicos propios, gemelo hidráulico o chat de WhatsApp Business.

**Bases futurX del PDF adjunto:** equipos de 2–4; uso de IA para prototipo funcional; entrega URL y pitch (el pitch se hará después, por decisión del equipo); no mostrar nombres/centros/países de origen de autores; cierre de entrega publicado para sábado 24 de octubre de 2026 al mediodía, hora de Perú. Criterios: solución 50%, pitch 20%, facilidad 20%, difusión 10%.

## 8. Protocolo obligatorio de cambios e integración

1. El integrante 1 crea proyecto base y copia este archivo a `docs/api-contracts.md` (mismo contenido) y `shared/contracts.ts` a `src/contracts/api.ts`.
2. Cada integrante lee contrato y ejemplos de `fixtures/` antes de escribir código. El frontend usa fixtures desde el primer día.
3. No renombrar propiedades, cambiar rutas o añadir campos obligatorios sin aprobación de todos.
4. Una rama por persona, commits por avances pequeños y pull request con la plantilla `ENTREGA.md`.
5. Para integrar: primero merge simulación, luego IA, luego frontend; ejecutar pruebas y E2E.
6. Si surge conflicto, corregir el módulo que no respeta el contrato; cambiar contrato solo mediante decisión conjunta.
7. Al final, comprobar que la web funciona en Vercel incluso en ventana privada y sin el servidor local abierto.

## 9. Seguridad y avisos para el MVP

- Las API deben validar payloads y limitar tamaño de solicitudes; no exponer stacks ni claves.
- `POST /api/plan`: aplicar límite razonable de solicitudes si el proveedor/cuenta lo requiere para controlar costos.
- No emitir por logs texto de solicitudes familiares ni respuestas completas de LLM.
- Mensajes siempre informan que el escenario es ilustrativo y la autoridad local prevalece.
- No hay pronóstico real, GPS, rastreo, ni acceso a contactos del usuario.
- Los datos abiertos (OpenStreetMap/CENEPRED/INDECI) se referencian de forma adecuada, respetando licencias y calidad de la fuente.

---

**Actualización aprobada v1.0.1:** el único cambio de interfaz es que `originId` admite tres valores y el frontend lee `places.geojson`. `/api/plan` y el formato de `SimulationResponse` no cambian. El integrante 1 debe actualizar `src/contracts/api.ts` de forma coordinada.

**Resumen inmutable del equipo:** `GET /api/simulate` = rutas y mapa; `POST /api/plan` = plan REAL con LLM; `/shared#plan=v1.<token>` = compartir versión pública sin backend. **Equipo SYNAPSE**; **sin presentación por ahora**; **sin autores identificables en la entrega**.
