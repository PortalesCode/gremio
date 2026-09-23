/**
 * gremio-estado.ts — Estado del proyecto para el Gremio (read-only, sin shell).
 *
 * Expone UNA tool: `gremio_estado`.
 * Devuelve: raíz, repo git (rama, remoto, commits), tablero, si es web app
 * (con match preciso de frameworks), qué herramientas pesadas están encendidas,
 * y qué base ya tiene el proyecto (tests, CI, README, CONTRIBUTING, licencia).
 *
 * No ejecuta comandos: lee `.git/`, `package.json`, marcadores, `opencode.json`
 * y presencia de archivos/carpetas. Nunca lanza: ante error devuelve lo disponible.
 *
 * La lógica pura vive en `../lib/gremio-helpers` (testeable sin el runtime de
 * OpenCode). Este archivo solo arma la tool.
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import {
  leerRama,
  leerRemoto,
  tieneCommits,
  detectarWeb,
  leerHerramientas,
  tieneTests,
  tieneCI,
} from "../lib/gremio-helpers";

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
