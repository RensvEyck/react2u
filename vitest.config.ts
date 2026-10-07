import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Dezelfde alias als in tsconfig.json, zodat een test ook een module kan laden
// die zelf `@/…` importeert (zoals lib/concept.ts met de JSON-concepten).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
