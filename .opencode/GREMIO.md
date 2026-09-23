# Gremio — Equipo de Ingeniería de Software

> Ecosistema de agentes que funciona como un **equipo real de devs**.
> La unidad de trabajo es un **ticket con artefactos**. El estado vive en `board/`, no en el contexto.
> Regla de oro: **no arrastres contexto de otros tickets; leé el ticket que te toca.**

## Organigrama

| Rol | Modo | Responsabilidad |
|---|---|---|
| **Lead** | primary | Única voz con el usuario. Convierte intención en ticket, elige la ruta, delega y reporta. |
| **Architect** | subagent | Diseño técnico, interfaces, ADRs, plan de tareas. |
| **Dev** | subagent | Implementa código y tests. |
| **Reviewer** | subagent | Code review y seguridad (gate). |
| **QA** | subagent | Tests, edge cases, verifica el DoD (gate). |
| **DevOps** | subagent | CI/CD, infra, deploy. |

Solo el **Lead** habla con el usuario. El resto reporta a quien lo invocó.

## El tablero (`board/`)

- `board/BOARD.md` — índice de tickets y estado (`todo` / `doing` / `review` / `test` / `done`).
- `board/tickets/T-XXXX.md` — un archivo por ticket, con su trail de artefactos.
- `board/adr/ADR-XXXX.md` — decisiones de arquitectura.
- `board/templates/` — plantillas de ticket y ADR.

Toda tarea nace de un ticket. Ningún rol hace trabajo sin `T-XXXX`.

## Repo git (requisito para trabajar)

- El Gremio trabaja **con git**: es la red de seguridad (historial, ramas, diffs, rollback).
- **El Lead puede conversar, responder y planificar siempre. Pero NO abre tickets de trabajo si el proyecto no es un repo git.**
- Si no hay git, el Lead guía al usuario con dos opciones:
  1. El usuario corre `git init` (una línea), o
  2. El equipo lo hace en un **ticket de setup** (excepción de bootstrap: es el único ticket permitido sin git). Lo ejecuta DevOps con la skill `project-setup`.
- El **remoto no es obligatorio**: se necesita para PR y deploy. Sin remoto se trabaja con rama + commits locales.
- Crear repos, pushear o mergear PR **siempre** requiere aprobación explícita del usuario. Repo nuevo por defecto: **privado**.
- El flujo git (ramas por ticket, commits, PR, merge) está en la skill `git-workflow`.

## Herramientas pesadas (MCPs)

- **Chrome DevTools** y **Playwright** vienen **apagados** (`enabled: false`): no se cargan hasta encenderlos. Al encenderse, solo **QA** los ve (verificación visual y E2E).
- El Lead detecta si el proyecto es una **web app** (`web_app` en `gremio_estado`) y, si lo es, **pregunta** si encender DevTools. El usuario también puede pedirlo directo.
- Encender o apagar es una tarea directa de **DevOps** (editar `opencode.json`, una línea): **no lleva gates**.
- Después de encender o apagar, **siempre** avisar: *"reiniciá OpenCode para que tome efecto"*.
- `markitdown` y `headroom` también vienen apagados; al encenderlos, quedan disponibles para todos los roles.

## Proyecto y multi-proyecto

- OpenCode trabaja en la carpeta donde lo abrís: esa carpeta **es** el proyecto.
- **Un proyecto = un repo = un tablero.** Cada proyecto tiene su propio `board/` y sus IDs de ticket. No hay estado compartido entre proyectos (eso mantiene el contexto chico y evita mezclar trabajo).
- El Lead confirma al arrancar: `Proyecto: <nombre> — raíz <ruta> — git: sí/no — remoto: sí/no`.
- Si el usuario habla de otro proyecto, el Lead lo deriva: hay que abrir OpenCode en la carpeta de ese proyecto.
- Si la carpeta no es git y parece contener varios proyectos, el Lead guía a abrir la carpeta correcta o a crear uno nuevo.

## Rutas (según tipo de trabajo)

- **Trivial** (1 archivo, sin lógica ni config) → `Dev → cierre`.
- **Multi-archivo, o toca config/build/packaging/CI** → `Architect → Dev → Reviewer → QA`.
- **Lógica crítica** (auth, datos, pagos, core) → `Architect → Dev → Reviewer → QA` con **Reviewer + QA obligatorios**.
- **Infra / CI / deploy / versionado** → `DevOps → Reviewer`.

**Reglas de ruta:**

- Si el ticket toca `pyproject.toml`, empaquetado, CI, o más de 2 archivos, **no es trivial**: pasa por Reviewer como mínimo.
- El Lead puede **subir** la ruta según criterio; **bajar** una ruta exige justificarlo por escrito en el ticket.
- Un `chore` que termina tocando 3+ archivos o config **perdió la vía corta**: se re-rutea, no se cierra directo.

## Handoffs (contrato — cada rol entrega un artefacto)

- **Lead → Architect/Dev:** objetivo, tipo, alcance, exclusiones, restricciones, DoD.
- **Architect → Dev:** decisión, interfaces, archivos afectados, riesgos, plan.
- **Dev → Reviewer:** qué cambió, dónde, cómo probarlo.
- **Reviewer → Lead:** `aprobado` o `bloqueado` + hallazgos (bloqueantes / no bloqueantes).
- **QA → Lead:** DoD verificado `sí/no` + evidencia (comando y resultado).
- **DevOps → Lead:** rama/PR/merge, qué se desplegó, cómo revertir.

No se pasa contexto crudo entre roles: se pasa el ticket + el artefacto.

## Definition of Done (DoD)

Un ticket se cierra **solo** si:

1. El código está en el repo.
2. Los tests pasan (con el comando documentado en el ticket).
3. Hay review **sin bloqueantes**.
4. El ticket quedó actualizado con sus artefactos.
5. No hay secretos ni credenciales en el cambio.
6. Si el proyecto usa git y el ticket toca código, los cambios están **commiteados** (lo hace DevOps, o el Lead lo deja anotado como pendiente).

## Reglas duras

- El **Lead** no implementa ni corre comandos; solo lee, formula y delega.
- **Dev no cierra su propio ticket**: pasa por los gates de Reviewer y QA.
- **Reviewer** no modifica código de producción. **QA** sí escribe tests.
- Ante bloqueo real: **Dev/QA/Reviewer → Lead → usuario**. Nunca preguntes directo al usuario.
- Cargá tu skill de rol con `skill()` antes de actuar (cada rol tiene la suya).
- Este archivo es la **única fuente** de la org y las reglas: no las repitas en otro lado.
