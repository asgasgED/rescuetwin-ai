# RescueTwin AI — SYNAPSE

Plataforma de demostración para explorar cierres hipotéticos de vías en Catacaos, Piura, calcular rutas alternativas sobre calles de OpenStreetMap y generar planes familiares de preparación mediante NVIDIA Nemotron.

La cartografía vial procede de OpenStreetMap. Los tres hogares, el punto de encuentro y los escenarios de aniego y bloqueo son ilustrativos. **Las rutas no están validadas para evacuaciones reales ni constituyen instrucciones oficiales.**

## Requisitos

- Node.js compatible con Next.js 16 y npm.
- Python 3 para las pruebas geoespaciales y HTTP.
- Acceso a la API de NVIDIA para generar planes.

## Instalar en Windows (CMD)

```cmd
npm ci
copy .env.example .env.local
notepad .env.local
```

En `.env.local`, sustituye `REEMPLAZAR_CON_CLAVE_NVIDIA` por tu clave real en `NVIDIA_API_KEY`. No añadas el prefijo `NEXT_PUBLIC_` ni subas ese archivo a GitHub.

```cmd
npm run dev
```

Abre `http://localhost:3000`. Elige un hogar, alterna los escenarios y solicita un plan familiar. Para cambiar a otro puerto, usa la dirección que muestre Next.js.

## Pruebas antes de publicar

Con las dependencias instaladas:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -File tests\run_all.ps1
npm run build
```

El primero verifica TypeScript, ESLint, compartición, motor geoespacial, seis recorridos, GeoJSON, contrato y módulo de IA con un proveedor simulado. `npm run build` comprueba que Next.js construya la aplicación para producción.

Para comprobar el **LLM real** después de configurar `.env.local` y ejecutar las pruebas anteriores:

```cmd
node tests\test_nemotron_real.cjs
```

Para comprobar ambas API por HTTP, mantén `npm run dev` ejecutándose y abre una segunda consola en la raíz del proyecto:

```cmd
python tests\smoke_http.py --base http://localhost:3000
python tests\smoke_plan_http.py --base http://localhost:3000
```

El segundo comando realiza una generación de plan con la API real y consume solicitudes del proveedor. Comprueba también la página `/shared` copiando un enlace de plan desde la interfaz.

## Organización

- `src/app/` y `src/components/`: frontend, API y vista compartida.
- `src/lib/graph.ts`, `src/lib/simulator.ts` y `src/lib/generated/dataset.ts`: motor geoespacial.
- `public/data/`: datos y escenarios OSM descargados para Catacaos.
- `src/lib/ai.ts`, `src/lib/plan-validation.ts` y `src/lib/sources.ts`: generación y validación del plan.
- `docs/api-contracts.md`: contrato de integración v1.0.1.
- `tests/`: comprobaciones del frontend, geoespacial, NVIDIA e integración.
- `scripts/build_graph.py`: regeneración de datos OSM si fuese necesaria. No utilices `--source demo` para este entregable.

## Compartir planes

Puedes copiar un enlace, abrir WhatsApp con el mensaje preparado, usar el menú de compartir del dispositivo o guardar una tarjeta PNG para historias. El enlace contiene un resumen comprimido en el fragmento de la URL: **no está cifrado** y cualquier persona que lo reciba puede leerlo. No se almacena una base de datos de planes. La publicación automática en Estados de WhatsApp no está implementada.

## Publicación

Antes de subir a GitHub confirma `git status` y que `.env.local`, `.git`, `node_modules`, `.next`, `dist` y los archivos de pruebas compilados no se incluyan. Configura `NVIDIA_API_KEY` también en las variables de entorno del proyecto Vercel. La aplicación debe aparecer bajo el nombre del equipo **SYNAPSE**, sin nombres, universidades ni países de los participantes.

Consulta `docs/AUDITORIA_INTEGRACION.md` para conocer las diferencias verificadas respecto a los entregables de los tres roles.
