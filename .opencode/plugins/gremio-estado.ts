/**
 * gremio-estado.ts — Estado del proyecto para el Gremio (read-only, sin shell).
 *
 * Expone UNA tool: `gremio_estado`.
 * Devuelve: raíz, repo git (rama, remoto, commits), tablero, si es web app,
 * qué herramientas pesadas están encendidas, y qué base ya tiene el proyecto
 * (tests, CI, README, CONTRIBUTING, licencia).
 *
 * No ejecuta comandos: lee `.git/`, `package.json`, marcadores, `opencode.json`
 * y presencia de archivos/carpetas. Nunca lanza: ante error devuelve lo disponible.
 *
 * Uso: al arrancar cada sesión. Permite al Lead saber dónde está, si puede abrir
 * tickets (sin git, no) y qué puesta en marcha ofrecer sin duplicar lo existente.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

const MARCAS_WEB = [
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

const MARCADORES_WEB = [
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

const PATRONES_TEST = [
  /^test_.*\.py$/,
  /.*_test\.py$/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
  /.*_test\.go$/,
  /.*_spec\.rb$/,
];

function leerRama(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf-8").trim();
    const m = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (m) return m[1];
    return head.slice(0, 8) || null;
  } catch {
    return null;
  }
}

function leerRemoto(gitDir: string): string | null {
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

function tieneCommits(gitDir: string, rama: string | null): boolean {
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

function detectarWeb(raiz: string): { es: boolean; stack: string[]; senales: string[] } {
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
        const hit = deps.find((d) => d.includes(marca));
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

function leerHerramientas(raiz: string): Record<string, boolean> | null {
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

function tieneTests(raiz: string): boolean {
  const dirs = ["tests", "test", "spec", "__tests__", "src/tests", "src/__tests__"];
  if (dirs.some((d) => existsSync(join(raiz, d)))) return true;
  try {
    return readdirSync(raiz).some((f) => PATRONES_TEST.some((p) => p.test(f)));
  } catch {
    return false;
  }
}

function tieneCI(raiz: string): boolean {
  try {
    const d = join(raiz, ".github", "workflows");
    return existsSync(d) && readdirSync(d).some((f) => /\.ya?ml$/.test(f));
  } catch {
    return false;
  }
}

export default (async ({ directory }) => {
  return {
    tool: {
      gremio_estado: tool({
        description:
          "Estado del proyecto para el Gremio: raíz, repo git (rama, remoto, commits), tablero, web app, herramientas encendidas y base del proyecto (tests, CI, README, CONTRIBUTING, licencia). Read-only, sin shell. Llamala al arrancar cada sesión.",
        args: {},
        async execute(_args, context) {
          const raiz = context.directory || directory;
          const gitDir = join(raiz, ".git");
          const esGit = existsSync(gitDir);
          const rama = esGit ? leerRama(gitDir) : null;
          const remoto = esGit ? leerRemoto(gitDir) : null;
          const commits = esGit ? tieneCommits(gitDir, rama) : false;

          const tieneBoard = existsSync(join(raiz, "board"));
          let tickets = 0;
          try {
            tickets = readdirSync(join(raiz, "board", "tickets")).filter((f) =>
              /^T-\d+\.md$/.test(f)
            ).length;
          } catch {
            tickets = 0;
          }

          const web = detectarWeb(raiz);
          const herramientas = leerHerramientas(raiz);
          const devtoolsOn = herramientas?.["chrome-devtools"] === true;

          const base = {
            tests: tieneTests(raiz),
            ci: tieneCI(raiz),
            readme: existsSync(join(raiz, "README.md")),
            contributing: existsSync(join(raiz, "CONTRIBUTING.md")),
            licencia: existsSync(join(raiz, "LICENSE")) || existsSync(join(raiz, "LICENSE.md")),
          };

          const avisos: string[] = [];
          if (!esGit) {
            avisos.push(
              "NO es un repo git: no abras tickets de trabajo. Podés conversar y planificar. " +
                "Guiá al usuario: (1) correr `git init`, o (2) ticket de setup ejecutado por DevOps."
            );
          } else if (!commits) {
            avisos.push("Repo git sin commits: el primer commit corresponde al ticket de setup (DevOps).");
          }
          if (web.es && !devtoolsOn) {
            avisos.push(
              "Es una web app y Chrome DevTools está apagado: preguntale al usuario si quiere encenderlo " +
                "para verificación visual (QA). Si acepta, es tarea directa de DevOps; recordá al final: reiniciar OpenCode."
            );
          }
          if (esGit && commits && !base.tests) {
            avisos.push("No hay tests: ofrecé el ticket de test-setup (Dev).");
          }
          if (esGit && commits && !base.ci) {
            avisos.push("No hay CI: ofrecé el ticket de ci-setup (DevOps) si hay remoto.");
          }
          if (esGit && commits && !remoto) {
            avisos.push("Sin remoto: se trabaja local (rama + commits). El remoto solo hace falta para PR/CI/deploy.");
          }

          return JSON.stringify(
            {
              raiz,
              es_git: esGit,
              rama,
              remoto,
              tiene_commits: commits,
              board: tieneBoard ? join(raiz, "board") : null,
              tickets,
              web_app: web.es,
              web_stack: web.stack,
              web_senales: web.senales,
              herramientas,
              base,
              aviso: avisos.length > 0 ? avisos.join(" ") : null,
            },
            null,
            2
          );
        },
      }),
    },
  };
}) satisfies Plugin;
