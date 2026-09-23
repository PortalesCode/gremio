/**
 * gremio-helpers.ts — Funciones puras del plugin `gremio_estado`.
 *
 * Vive en `.opencode/lib/` (y NO en `.opencode/plugins/`) porque OpenCode
 * auto-carga todo archivo de `plugins/`: este módulo no debe registrarse como
 * plugin. Solo usa `fs` y `path`; no depende de `@opencode-ai/plugin`, así que
 * puede testearse en un clon fresco sin el runtime de OpenCode.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export const MARCAS_WEB = [
  "react",
  "next",
  "vue",
  "nuxt",
  "svelte",
  "angular",
  "astro",
  "gatsby",
  "remix",
  "solid-js",
  "preact",
  "ember",
  "vite",
];

/** Scopes de paquetes que no siguen el patrón `@<marca>/`. */
export const SCOPES_WEB: Record<string, string[]> = {
  vite: ["@vitejs/"],
  remix: ["@remix-run/"],
  svelte: ["@sveltejs/"],
  astro: ["@astrojs/"],
  "solid-js": ["@solidjs/"],
};

export const MARCADORES_WEB = [
  "index.html",
  "public/index.html",
  "src/index.html",
  "src/App.tsx",
  "src/App.jsx",
  "src/App.vue",
  "src/App.svelte",
  "app/page.tsx",
  "pages/index.tsx",
];

export const PATRONES_TEST = [
  /^test_.*\.py$/,
  /.*_test\.py$/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
  /.*_test\.go$/,
  /.*_spec\.rb$/,
];

/**
 * ¿La dependencia `dep` pertenece a la marca `marca`?
 *
 * Match preciso (no substring): `vitest` NO debe contar como `vite`.
 * Acepta el nombre exacto, el prefijo `<marca>-` y el scope `@<marca>/`,
 * más los scopes alternativos declarados en `SCOPES_WEB`.
 */
export function coincideMarca(dep: string, marca: string): boolean {
  return (
    dep === marca ||
    dep.startsWith(`${marca}-`) ||
    dep.startsWith(`@${marca}/`) ||
    (SCOPES_WEB[marca] ?? []).some((scope) => dep.startsWith(scope))
  );
}

export function leerRama(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf-8").trim();
    const m = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (m) return m[1];
    return head.slice(0, 8) || null;
  } catch {
    return null;
  }
}

export function leerRemoto(gitDir: string): string | null {
  try {
    const cfg = readFileSync(join(gitDir, "config"), "utf-8");
    const bloque = cfg.match(/\[remote\s+"[^"]+"\]([\s\S]*?)(?=\n\[|$)/);
    if (!bloque) return null;
    const url = bloque[1].match(/url\s*=\s*(.+)/);
    return url ? url[1].trim() : null;
  } catch {
    return null;
  }
}

export function tieneCommits(gitDir: string, rama: string | null): boolean {
  try {
    if (rama && existsSync(join(gitDir, "refs", "heads", rama))) return true;
    const packed = join(gitDir, "packed-refs");
    if (rama && existsSync(packed)) {
      return readFileSync(packed, "utf-8").includes(`refs/heads/${rama}`);
    }
    return false;
  } catch {
    return false;
  }
}

export function detectarWeb(raiz: string): { es: boolean; stack: string[]; senales: string[] } {
  const stack: string[] = [];
  const senales: string[] = [];
  try {
    const pkg = join(raiz, "package.json");
    if (existsSync(pkg)) {
      const j = JSON.parse(readFileSync(pkg, "utf-8"));
      const deps = Object.keys({
        ...(j.dependencies ?? {}),
        ...(j.devDependencies ?? {}),
      });
      for (const marca of MARCAS_WEB) {
        const hit = deps.find((d) => coincideMarca(d, marca));
        if (hit && !stack.includes(marca)) {
          stack.push(marca);
          senales.push(`package.json: ${hit}`);
        }
      }
    }
  } catch {
    /* package.json ausente o inválido */
  }
  for (const p of MARCADORES_WEB) {
    if (existsSync(join(raiz, p))) senales.push(p);
  }
  return { es: stack.length > 0 || senales.length > 0, stack, senales };
}

export function leerHerramientas(raiz: string): Record<string, boolean> | null {
  try {
    const cfg = join(raiz, "opencode.json");
    if (!existsSync(cfg)) return null;
    const j = JSON.parse(readFileSync(cfg, "utf-8"));
    const mcp = j.mcp ?? {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(mcp)) {
      const valor = v as { enabled?: boolean } | null;
      out[k] = !(valor && typeof valor === "object" && valor.enabled === false);
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function tieneTests(raiz: string): boolean {
  const dirs = ["tests", "test", "spec", "__tests__", "src/tests", "src/__tests__"];
  if (dirs.some((d) => existsSync(join(raiz, d)))) return true;
  try {
    return readdirSync(raiz).some((f) => PATRONES_TEST.some((p) => p.test(f)));
  } catch {
    return false;
  }
}

export function tieneCI(raiz: string): boolean {
  try {
    const d = join(raiz, ".github", "workflows");
    return existsSync(d) && readdirSync(d).some((f) => /\.ya?ml$/.test(f));
  } catch {
    return false;
  }
}
