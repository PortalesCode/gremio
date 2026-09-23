---
name: write-ticket
description: Cómo el Lead convierte una intención del usuario en un ticket claro, elige la ruta y mantiene el tablero. Usar al abrir cualquier trabajo.
---

# Runbook — Escribir un ticket

## Formato
Copiá `board/templates/ticket.md` a `board/tickets/T-XXXX.md` (ID incremental de 4 dígitos).

## Campos obligatorios
- **Título:** acción concreta, no un tema.
- **Tipo:** `feature` | `bug` | `chore`.
- **Objetivo:** qué resultado se espera.
- **Alcance / Exclusiones:** qué entra y qué no.
- **Restricciones:** lo que no se puede romper.
- **DoD:** criterios verificables (test/comando).
- **Ruta:** `Dev` | `Architect → Dev → Reviewer → QA` | crítica.

## Elegir la ruta
- 1 archivo, sin lógica crítica → **Dev** directo.
- Feature o +2 archivos → **Architect → Dev → Reviewer → QA**.
- Auth, datos, pagos, core → igual que feature, con **Reviewer + QA obligatorios**.

## Tablero
Actualizá `board/BOARD.md` con: ID, título, estado (`todo/doing/review/test/done`) y responsable.

## Checklist del Lead
- [ ] Creé el ticket con todos los campos.
- [ ] La ruta está escrita en el ticket.
- [ ] Anoté el ticket en el tablero.
- [ ] Delegué al primer rol de la ruta con el ticket (no la conversación).
- [ ] Cierro solo con el DoD completo.
