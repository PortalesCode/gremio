# Gremio — Equipo de Ingeniería de Software para OpenCode

Gremio convierte a OpenCode en un **equipo real de devs**: roles con responsabilidad clara, un tablero de tickets y handoffs por artefactos. Está diseñado para **gastar pocos tokens**: el contexto fijo es chico y la profundidad se carga on-demand.

## Por qué es eficiente

Un equipo real no se coordina releyendo todo el contexto: se coordina con **rol + artefacto + handoff**. El estado vive en `board/`, no en el prompt.

| | Crisol Definitivo | Gremio |
|---|---|---|
| Contexto fijo por request | ~33-38k tokens | **~5-7k tokens** |
| Documento del equipo | AGENTS.md 24 KB | ~4 KB |
| Prompts de agente | hasta 33 KB | ~1-2 KB cada uno |
| Reglas | repetidas en 4 lados | 1 sola fuente |
| MCPs activos | 7 (~100 tools) | 3, resto denegado |
| Procedimiento | en prompts fijos | en skills on-demand |

## El equipo

| Rol | Qué hace | Puede escribir |
|---|---|---|
| **Lead** | Única voz con el usuario. Confirma el proyecto, verifica git, crea el ticket, elige la ruta, delega y reporta. | solo `board/` |
| **Architect** | Diseño técnico, interfaces, ADRs, plan. | solo `board/` |
| **Dev** | Implementa código + tests. | código |
| **Reviewer** | Code review y seguridad (gate). | solo `board/` |
| **QA** | Tests, edge cases, verifica el DoD (gate). | tests |
| **DevOps** | Git, setup del repo, ramas/PRs, CI/CD, deploy. | código/infra |

Flujo típico: `Lead → Dev → Reviewer + QA`. Architect y DevOps entran cuando la tarea los pide.

Cada rol ve **solo sus skills**: el de desarrollo no ve la de deploy, y viceversa.

## Git: requisito para trabajar

Gremio trabaja **con git** (historial, ramas, PRs, rollback). El Lead **puede conversar y planificar siempre**, pero **no abre tickets de trabajo si el proyecto no es un repo git**. Si no lo es, te guía con dos opciones:

1. Correr `git init` (una línea), o
2. Un **ticket de setup** que ejecuta DevOps (git init + primer commit + remoto opcional).

El **remoto no es obligatorio**: hace falta para PR y deploy. Sin remoto se trabaja con rama + commits locales. Crear repos, pushear o mergear PR **siempre** requiere tu aprobación; repo nuevo por defecto **privado**.

## Varios proyectos a la vez

OpenCode trabaja en la carpeta donde lo abrís. **Un proyecto = un repo = un tablero**: cada uno tiene su propio `board/` y sus IDs de ticket, sin estado compartido (eso mantiene el contexto chico y evita mezclar trabajo).

Para trabajar en varios proyectos, abrí una sesión de OpenCode **en la carpeta de cada proyecto**. El Lead te dice al arrancar en cuál está parado.

## El tablero

```
board/
├── BOARD.md            # proyecto + índice de tickets y estado
├── tickets/T-XXXX.md   # un archivo por ticket, con sus artefactos
├── adr/ADR-XXXX.md     # decisiones de arquitectura
└── templates/          # plantillas de ticket y ADR
```

## Definición de Done

Un ticket se cierra solo si: el código está en el repo, los tests pasan (comando documentado), hay review sin bloqueantes, el ticket tiene sus artefactos, no hay secretos, y los cambios quedaron **commiteados**.

## Instalación

```bash
git clone https://github.com/PortalesCode/gremio.git
cd tu-proyecto
../gremio/install.sh
```

Opciones: `--target <dir>`, `--dry-run`, `--keep-package`.

Qué hace el instalador:
- Copia `.opencode/` (agentes, skills, plugin) siempre.
- Crea `board/` solo con lo que falta: **no pisa tu tablero**.
- Inyecta el documento del equipo en tu `AGENTS.md` entre los marcadores `<!-- GREMIO-START -->` y `<!-- GREMIO-END -->`, sin tocar el resto. En reinstalaciones, solo actualiza ese bloque.
- Mergea `opencode.json` (MCPs, permisos, `default_agent: lead`) sin pisar tus claves.
- Avisa si el destino no es un repo git.

Luego reiniciá OpenCode. Arranca directo en el **Lead**.

## Uso

Hablale al Lead. Ejemplo: *"hacé que el proyecto se vea más profesional"* → el Lead pregunta lo justo, abre tickets y arranca el equipo.

## Estructura

```
gremio/
├── .opencode/
│   ├── GREMIO.md        # doc del equipo (se inyecta en tu AGENTS.md)
│   ├── agents/          # lead, architect, dev, reviewer, qa, devops
│   ├── skills/          # runbooks on-demand (incluye git-workflow y project-setup)
│   └── plugins/         # tool gremio_estado (estado del proyecto: git + board)
├── board/               # tablero de tickets
├── opencode.json        # MCPs mínimos + permisos + default_agent
└── install.sh
```

## Notas

- Gremio es agnóstico de stack: las particularidades van en skills.
- Los MCPs pesados (chrome-devtools, playwright, markitdown, headroom) quedan **denegados** por defecto. Si los necesitás, quitá su línea de `permission` en `opencode.json`.
- Si tenés un `AGENTS.md` global en `~/` de otro ecosistema, OpenCode lo sigue inyectando: revisalo para no pagar tokens de reglas que no usás.
