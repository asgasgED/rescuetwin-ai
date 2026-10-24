/* Shim solo para compilar standalone sin instalar @types/node. No integrar en Next.js. */
declare const process: { env: Record<string, string | undefined> };
