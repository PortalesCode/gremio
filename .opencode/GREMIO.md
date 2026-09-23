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
- **DevOps → Lead:** qué se desplegó, cómo revertir.

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
