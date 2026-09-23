/**
 * gremio-estado.ts — Estado del proyecto para el Gremio (read-only, sin shell).
 *
 * Expone UNA tool: `gremio_estado`.
 * Devuelve: raíz del proyecto, si es repo git, rama, remoto, si hay commits,
 * existencia del tablero y cantidad de tickets.
 *
 * No ejecuta comandos: lee `.git/HEAD`, `.git/config`, `.git/refs` y el board.
 * Nunca lanza: ante cualquier error devuelve el estado disponible.
 *
 * Se usa al arrancar cada sesión para que el Lead sepa dónde está y si puede
 * abrir tickets de trabajo (sin git, no).
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";

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

export default (async ({ directory }) => {
  return {
    tool: {
      gremio_estado: tool({
        description:
          "Estado del proyecto para el Gremio: raíz, si es repo git, rama, remoto, si hay commits y cuántos tickets hay en el tablero. Read-only, sin shell. Llamala al arrancar cada sesión.",
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

          let aviso: string | null = null;
          if (!esGit) {
            aviso =
              "NO es un repo git: no abras tickets de trabajo. Podés conversar y planificar. " +
              "Guiá al usuario: (1) correr `git init` en la raíz, o (2) ticket de setup ejecutado por DevOps.";
          } else if (!commits) {
            aviso =
              "Repo git sin commits: el primer commit corresponde al ticket de setup (DevOps).";
          } else if (!remoto) {
            aviso =
              "Repo git sin remoto: se puede trabajar local (rama + commits). El remoto solo hace falta para PR/deploy.";
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
              aviso,
            },
            null,
            2
          );
        },
      }),
    },
  };
}) satisfies Plugin;
