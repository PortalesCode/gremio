# Gremio — Equipo de Ingeniería de Software para OpenCode

Gremio convierte a OpenCode en un **equipo real de devs**: roles con responsabilidad clara, un tablero de tickets y handoffs por artefactos. Está diseñado para **gastar pocos tokens**: el contexto fijo es chico y la profundidad se carga on-demand.

## Por qué es eficiente

Un equipo real no se coordina releyendo todo el contexto: se coordina con **rol + artefacto + handoff**. El estado vive en `board/`, no en el prompt.

| | Crisol Definitivo | Gremio |
|---|---|---|
| Contexto fijo por request | ~33-38k tokens | **~5-7k tokens** |
| Documento del equipo | AGENTS.md 24 KB | ~3 KB |
| Prompts de agente | hasta 33 KB | ~1-2 KB cada uno |
| Reglas | repetidas en 4 lados | 1 sola fuente |
| MCPs activos | 7 (~100 tools) | 3, resto denegado |
| Procedimiento | en prompts fijos | en skills on-demand |

## El equipo

| Rol | Qué hace | Puede escribir |
|---|---|---|
| **Lead** | Única voz con el usuario. Crea el ticket, elige la ruta, delega y reporta. | solo `board/` |
| **Architect** | Diseño técnico, interfaces, ADRs, plan. | solo `board/` |
| **Dev** | Implementa código + tests. | código |
| **Reviewer** | Code review y seguridad (gate). | solo `board/` |
| **QA** | Tests, edge cases, verifica el DoD (gate). | tests |
| **DevOps** | CI/CD, infra, deploy. | código/infra |

Flujo típico: `Lead → Dev → Reviewer + QA`. Architect y DevOps entran cuando la tarea los pide.

Cada rol ve **solo su skill**: el de desarrollo no ve la de deploy, y viceversa.

## El tablero

```
board/
├── BOARD.md            # índice de tickets y estado
├── tickets/T-XXXX.md   # un archivo por ticket, con sus artefactos
├── adr/ADR-XXXX.md     # decisiones de arquitectura
└── templates/          # plantillas de ticket y ADR
```

## Definición de Done

Un ticket se cierra solo si: el código está en el repo, los tests pasan (comando documentado), hay review sin bloqueantes, el ticket tiene sus artefactos, y no hay secretos.

## Instalación

```bash
git clone https://github.com/PortalesCode/gremio.git
cd tu-proyecto
../gremio/install.sh
```

Opciones: `--target <dir>`, `--dry-run`, `--keep-package`.

Qué hace el instalador:
- Copia `.opencode/` (agentes y skills) siempre.
- Crea `board/` solo con lo que falta: **no pisa tu tablero**.
- Inyecta el documento del equipo en tu `AGENTS.md` entre los marcadores `<!-- GREMIO-START -->` y `<!-- GREMIO-END -->`, sin tocar el resto de tu archivo. En reinstalaciones, solo actualiza ese bloque.
- Mergea `opencode.json` (MCPs, permisos, `default_agent: lead`) sin pisar tus claves.

Luego reiniciá OpenCode. Arranca directo en el **Lead**.

## Uso

Hablale al Lead. Ejemplo: *"el login falla con emails en mayúscula"* → el Lead crea el ticket, elige la ruta y arranca el equipo.

## Estructura

```
gremio/
├── .opencode/
│   ├── GREMIO.md        # doc del equipo (se inyecta en tu AGENTS.md)
│   ├── agents/          # lead, architect, dev, reviewer, qa, devops
│   └── skills/          # 8 runbooks on-demand
├── board/               # tablero de tickets
├── opencode.json        # MCPs mínimos + permisos + default_agent
└── install.sh
```

## Notas

- Gremio es agnóstico de stack: las particularidades van en skills.
- Los MCPs pesados (chrome-devtools, playwright, markitdown, headroom) quedan **denegados** por defecto. Si los necesitás, quitá su línea de `permission` en `opencode.json` (y considerá habilitarlos por agente).
- Si tenés un `AGENTS.md` global en `~/` de otro ecosistema, OpenCode lo sigue inyectando: revisalo para no pagar tokens de reglas que no usás.
