# Verificación final — SYNAPSE

## Ajustes realizados

- Distribución responsive: selección de hogar y escenario antes del mapa en pantallas estrechas; dos columnas para los controles en tablet y panel lateral en escritorio.
- El formulario y los resultados del plan ocupan el ancho disponible debajo del simulador.
- Controles táctiles y mapa adaptados a anchos pequeños.
- «Copiar mensaje» copia el plan completo, sin direcciones de desarrollo.
- «Enviar tarjeta por WhatsApp» y «Compartir desde dispositivo» intentan compartir un archivo PNG mediante las opciones del dispositivo.
- Si no se admiten archivos compartidos, la tarjeta se descarga para adjuntarla manualmente. WhatsApp no permite adjuntar automáticamente el PNG mediante enlaces `wa.me`.
- La IA recibe indicaciones de lenguaje familiar; respuestas que incluyan identificadores técnicos se rechazan y pueden reintentarse.

## Archivos editados

- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/MapView.tsx`
- `src/components/FamilyForm.tsx`
- `src/components/PlanResult.tsx`
- `src/lib/share.ts`
- `src/lib/ai.ts`
- `src/lib/plan-validation.ts`

Archivo nuevo: `tests/test_movil_compartir.mjs`.

## Pruebas locales (Windows)

En la raíz del proyecto:

```cmd
npm ci
npx tsc --noEmit
npm run lint
powershell -NoProfile -ExecutionPolicy Bypass -File tests\run_all.ps1
node tests\test_movil_compartir.mjs
npm run build
```

Configurar NVIDIA sin compartir la clave:

```cmd
copy .env.example .env.local
notepad .env.local
npm run dev
```

Verificar `/api/simulate`, `/api/plan` y el funcionamiento de la web desde `http://localhost:3000`.

## Revisiones visuales recomendadas

1. En las herramientas de desarrollo del navegador, probar anchos de 320, 375, 390, 430, 768 y 1024 px. No debe aparecer desplazamiento horizontal.
2. Comprobar los tres hogares y ambos escenarios; comprobar que las rutas y distancias cambian.
3. Generar un plan desde el formulario inferior y confirmar que ocupa el ancho de la página.
4. «Copiar mensaje» debe incluir todas las recomendaciones, fuentes y advertencia.
5. En un teléfono con HTTPS, probar «Compartir desde dispositivo» y «Enviar tarjeta por WhatsApp»: se debe ofrecer un archivo PNG si el navegador admite Web Share con archivos.
6. Si el navegador no admite archivos, confirmar que se descarga el PNG y se informa que debe adjuntarse manualmente.
7. Confirmar que no se envía `localhost` en las opciones de WhatsApp ni de compartir del dispositivo.

> En desarrollo, `localhost` solo funciona en el propio equipo. La página `/shared` se mantiene por compatibilidad, pero los botones de compartir ya no generan enlaces locales.
