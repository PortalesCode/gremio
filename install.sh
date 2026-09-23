#!/usr/bin/env bash
# =============================================================================
# install.sh — Instalador de Gremio (equipo de devs para OpenCode)
#
# Instala el ecosistema en el repo destino:
#   - .opencode/         agentes y skills (se actualizan siempre)
#   - board/             tablero (solo crea lo que falta; no pisa tu trabajo)
#   - AGENTS.md          inyecta el bloque Gremio entre marcadores (idempotente)
#   - opencode.json      mergea MCPs, permisos y default_agent sin pisar nada
#
# Uso:
#   ./install.sh                    # instala en el directorio actual
#   ./install.sh --target <dir>     # instala en <dir>
#   ./install.sh --dry-run          # muestra qué haría, sin copiar
#   ./install.sh --keep-package     # no borra el paquete al terminar
#
# Es idempotente: ejecutarlo dos veces no rompe nada.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$PWD"
DRY_RUN=0
KEEP_PACKAGE=0
START_MARK="<!-- GREMIO-START -->"
END_MARK="<!-- GREMIO-END -->"

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --keep-package) KEEP_PACKAGE=1; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

[ -d "$TARGET" ] || { echo "No existe el destino: $TARGET" >&2; exit 1; }
TARGET="$(cd "$TARGET" && pwd)"

run()  { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }
info() { printf '==> %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '  aviso: %s\n' "$*" >&2; }

verify_package() {
  for f in ".opencode/agents/lead.md" ".opencode/GREMIO.md" "opencode.json"; do
    [ -e "$SCRIPT_DIR/$f" ] || { echo "Paquete incompleto: falta $f" >&2; exit 1; }
  done
}
verify_package

# Copia recursiva de archivos, sobrescribiendo los del ecosistema pero sin borrar otros.
copy_tree() {
  local src="$1" dst="$2"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    local rel="${f#"$src"/}" out="$dst/${f#"$src"/}"
    run mkdir -p "$(dirname "$out")"
    run cp "$f" "$out"
  done < <(find "$src" -type f -print0)
}

# Copia solo lo que no existe en destino (no pisa trabajo del usuario).
copy_missing() {
  local src="$1" dst="$2"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    local out="$dst/${f#"$src"/}"
    [ -e "$out" ] && continue
    run mkdir -p "$(dirname "$out")"
    run cp "$f" "$out"
  done < <(find "$src" -type f -print0)
}

# Inyecta/actualiza el bloque Gremio en AGENTS.md entre marcadores.
merge_agents_md() {
  local src="$SCRIPT_DIR/.opencode/GREMIO.md" dst="$TARGET/AGENTS.md"
  [ -f "$src" ] || { warn "no encontré .opencode/GREMIO.md"; return 0; }
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] inyectar bloque Gremio en AGENTS.md"; return 0; fi
  local tool=""
  command -v node >/dev/null 2>&1 && tool="node"
  command -v python3 >/dev/null 2>&1 && [ -z "$tool" ] && tool="python3"
  if [ "$tool" = "node" ]; then
    node -e '
      const fs=require("fs");
      const [src,dst,START,END]=process.argv.slice(1);
      const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const block=START+"\n"+fs.readFileSync(src,"utf8").trim()+"\n"+END;
      let cur=fs.existsSync(dst)?fs.readFileSync(dst,"utf8"):"";
      const re=new RegExp(esc(START)+"[\\s\\S]*?"+esc(END));
      if(re.test(cur)){cur=cur.replace(re,block);}
      else{cur=cur.trim()?cur.trimEnd()+"\n\n"+block+"\n":block+"\n";}
      fs.writeFileSync(dst,cur);
    ' "$src" "$dst" "$START_MARK" "$END_MARK"
    ok "bloque Gremio en AGENTS.md"
  elif [ "$tool" = "python3" ]; then
    python3 -c '
import sys,re,os
src,dst,START,END=sys.argv[1:5]
block=START+"\n"+open(src,encoding="utf-8").read().strip()+"\n"+END
cur=open(dst,encoding="utf-8").read() if os.path.exists(dst) else ""
pat=re.escape(START)+r"[\s\S]*?"+re.escape(END)
if re.search(pat,cur): cur=re.sub(pat,lambda m:block,cur,count=1)
else: cur=(cur.rstrip()+"\n\n"+block+"\n") if cur.strip() else (block+"\n")
open(dst,"w",encoding="utf-8").write(cur)
' "$src" "$dst" "$START_MARK" "$END_MARK"
    ok "bloque Gremio en AGENTS.md"
  else
    warn "no hay node ni python3: no pude actualizar AGENTS.md"
  fi
}

# Mergea opencode.json (el proyecto gana en claves existentes).
merge_json() {
  local pkg="$1" proj="$2"
  [ -f "$pkg" ] || return 0
  if [ ! -f "$proj" ]; then run cp "$pkg" "$proj"; ok "opencode.json creado"; return 0; fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] mergear opencode.json"; return 0; fi
  local tool=""
  command -v node >/dev/null 2>&1 && tool="node"
  command -v python3 >/dev/null 2>&1 && [ -z "$tool" ] && tool="python3"
  if [ "$tool" = "node" ]; then
    node -e '
      const fs=require("fs");
      const [pkg,proj]=process.argv.slice(1);
      const a=JSON.parse(fs.readFileSync(pkg,"utf8"));
      const b=JSON.parse(fs.readFileSync(proj,"utf8"));
      b.mcp=Object.assign({},a.mcp||{},b.mcp||{});
      b.permission=Object.assign({},a.permission||{},b.permission||{});
      if(b.default_agent===undefined&&a.default_agent!==undefined)b.default_agent=a.default_agent;
      if(b.subagent_depth===undefined&&a.subagent_depth!==undefined)b.subagent_depth=a.subagent_depth;
      fs.writeFileSync(proj,JSON.stringify(b,null,2)+"\n");
    ' "$pkg" "$proj"
    ok "opencode.json mergeado"
  elif [ "$tool" = "python3" ]; then
    python3 -c '
import json,sys
pkg,proj=sys.argv[1],sys.argv[2]
a=json.load(open(pkg)); b=json.load(open(proj))
for key in ("mcp","permission"):
    b[key]=dict(a.get(key,{}),**b.get(key,{}))
if "default_agent" not in b and a.get("default_agent") is not None: b["default_agent"]=a["default_agent"]
if "subagent_depth" not in b and a.get("subagent_depth") is not None: b["subagent_depth"]=a["subagent_depth"]
json.dump(b,open(proj,"w"),indent=2,ensure_ascii=False); open(proj,"a").write("\n")
' "$pkg" "$proj"
    ok "opencode.json mergeado"
  else
    warn "no hay node ni python3; mergeá opencode.json a mano"
  fi
}

info "Gremio → $TARGET"
if [ ! -e "$TARGET/.git" ]; then
  warn "el destino no es un repo git. Gremio necesita git para trabajar: al abrir OpenCode, el Lead te va a guiar (correr 'git init' o un ticket de setup con DevOps)."
fi
if [ "$SCRIPT_DIR" = "$TARGET" ]; then
  info "El paquete ya está en el destino; se omite la copia de archivos"
else
  info "Paso 1/3 — .opencode/ (agentes y skills)"
  copy_tree "$SCRIPT_DIR/.opencode" "$TARGET/.opencode"

  info "Paso 2/3 — board/ (solo lo faltante)"
  copy_missing "$SCRIPT_DIR/board" "$TARGET/board"
fi

info "Paso 3/3 — AGENTS.md (bloque Gremio) y opencode.json"
merge_agents_md
merge_json "$SCRIPT_DIR/opencode.json" "$TARGET/opencode.json"

if [ "$KEEP_PACKAGE" -eq 0 ] && [ "$SCRIPT_DIR" != "$TARGET" ] && [[ "$SCRIPT_DIR" == "$TARGET"/* ]]; then
  info "Auto-limpieza del paquete clonado dentro del destino"
  run rm -rf "$SCRIPT_DIR"
fi

echo
info "Listo. Reiniciá OpenCode para que todo tome efecto."
