#!/usr/bin/env bash
# FORGE installer for Claude Code and Google Antigravity (macOS, Linux, Windows Git Bash/WSL).
# Copies the prebuilt adapters from dist/ — no Node.js required to install.
#
#   scripts/install.sh [--target claude|antigravity|all] [--scope user|project] [--project DIR]
#                      [--dry-run] [--force] [--uninstall]
#
# Defaults: --scope user; --target = every platform whose config dir exists (falls back to claude).
# Safety: tracks installed paths in a manifest; never overwrites files it did not install unless --force;
#         --uninstall removes only paths listed in the manifest.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO_DIR/dist"
TARGET="" SCOPE="user" PROJECT="$PWD" DRY=0 FORCE=0 MODE="install"

die() { echo "forge-install: $*" >&2; exit 1; }
usage() { sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --project) PROJECT="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --force) FORCE=1; shift ;;
    --uninstall) MODE="uninstall"; shift ;;
    -h|--help) usage ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done
case "$SCOPE" in user|project) ;; *) die "--scope must be user or project" ;; esac
[ "$SCOPE" = "project" ] && { [ -d "$PROJECT" ] || die "project dir not found: $PROJECT"; PROJECT="$(cd "$PROJECT" && pwd)"; }

CLAUDE_USER_ROOT="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
AG_USER_ROOT="${FORGE_ANTIGRAVITY_HOME:-$HOME/.gemini/config}"

if [ -z "$TARGET" ]; then
  TARGET=""
  [ -d "$CLAUDE_USER_ROOT" ] && TARGET="claude"
  [ -d "$HOME/.gemini" ] && TARGET="${TARGET:+$TARGET,}antigravity"
  [ -z "$TARGET" ] && TARGET="claude"
fi
[ "$TARGET" = "all" ] && TARGET="claude,antigravity"

run() { if [ "$DRY" = 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }

# install_platform <label> <root> <dist-subdir> <workflow-relpath-or-empty>
install_platform() {
  local label="$1" root="$2" src="$DIST/$3" wf_rel="$4"
  local manifest="$root/skills/forge/.forge-install-manifest"
  [ -d "$src" ] || die "missing $src — run: node scripts/build.mjs"
  local items=() old=() conflicts=()
  for d in "$src"/skills/*/; do items+=("skills/$(basename "$d")"); done
  for f in "$src"/agents/*.md; do items+=("agents/$(basename "$f")"); done
  [ -n "$wf_rel" ] && items+=("$wf_rel")
  if [ -f "$manifest" ]; then  # bash 3.2 compatible (no mapfile on macOS)
    while IFS= read -r line || [ -n "$line" ]; do line="${line%$'\r'}"; case "$line" in ''|'#'*) ;; *) old+=("$line") ;; esac; done < "$manifest"
  fi

  if [ "$MODE" = "uninstall" ]; then
    if [ ${#old[@]} -eq 0 ]; then echo "• $label: FORGE is not installed at $root"; return; fi
    for p in "${old[@]}"; do [ -n "$p" ] && [ -e "$root/$p" ] && run rm -rf "${root:?}/$p"; done
    echo "✓ $label: removed ${#old[@]} FORGE item(s) from $root"; return
  fi

  for p in "${items[@]}"; do
    if [ -e "$root/$p" ] && ! printf '%s\n' "${old[@]:-}" | grep -qxF "$p"; then conflicts+=("$p"); fi
  done
  if [ ${#conflicts[@]} -gt 0 ] && [ "$FORCE" != 1 ]; then
    printf '  conflict (not installed by FORGE): %s\n' "${conflicts[@]}" >&2
    die "$label: refusing to overwrite existing files at $root (re-run with --force to replace them)"
  fi
  # Upgrade cleanly: remove everything the previous FORGE install created (handles renamed/removed files).
  for p in "${old[@]:-}"; do [ -n "$p" ] && [ -e "$root/$p" ] && run rm -rf "${root:?}/$p"; done
  run mkdir -p "$root/skills" "$root/agents"
  for p in "${items[@]}"; do
    case "$p" in
      skills/*) [ -e "$root/$p" ] && run rm -rf "${root:?}/$p"; run cp -R "$src/$p" "$root/$p" ;;
      agents/*) run cp "$src/$p" "$root/$p" ;;
      *) run mkdir -p "$(dirname "$root/$p")"; run cp "$src/workflows/forge.md" "$root/$p" ;;
    esac
  done
  # Point the git-guard hooks at this install (plugin installs resolve the token natively).
  local home="$root/skills/forge"
  command -v cygpath >/dev/null 2>&1 && home="$(cygpath -m "$home")"  # Windows: node needs C:/... paths
  for p in "${items[@]}"; do
    case "$p" in agents/*.md|skills/forge) ;; *) continue ;; esac
    local files=("$root/$p"); [ "$p" = "skills/forge" ] && files=("$root/skills/forge/SKILL.md" "$root/skills/forge/platform.json")
    if [ "$DRY" = 1 ]; then continue; fi
    for f in "${files[@]}"; do
      if grep -q 'CLAUDE_PLUGIN_ROOT}/skills/forge' "$f" 2>/dev/null; then
        sed "s|\${CLAUDE_PLUGIN_ROOT}/skills/forge|$home|g" "$f" > "$f.tmp" && mv "$f.tmp" "$f"
      fi
    done
  done
  if [ "$DRY" = 1 ]; then echo "  [dry-run] write manifest $manifest"; else
    { echo "# FORGE install manifest $(cat "$REPO_DIR/VERSION") — paths relative to $root"; printf '%s\n' "${items[@]}"; } > "$manifest"
  fi
  local ns=0 na=0; for p in "${items[@]}"; do case "$p" in skills/*) ns=$((ns+1));; agents/*) na=$((na+1));; esac; done
  echo "✓ $label: installed $ns skills, $na agents${wf_rel:+, legacy workflow} → $root"
}

echo "FORGE $(cat "$REPO_DIR/VERSION") — $MODE (scope: $SCOPE, target: $TARGET)"
IFS=',' read -ra TARGETS <<< "$TARGET"
for t in "${TARGETS[@]}"; do
  case "$t" in
    claude)
      root="$CLAUDE_USER_ROOT"; [ "$SCOPE" = "project" ] && root="$PROJECT/.claude"
      install_platform "Claude Code" "$root" "claude-code" "" ;;
    antigravity)
      if [ "$SCOPE" = "project" ]; then install_platform "Antigravity" "$PROJECT/.agents" "antigravity" "workflows/forge.md"
      else install_platform "Antigravity" "$AG_USER_ROOT" "antigravity" "global_workflows/forge.md"; fi ;;
    *) die "unknown target: $t (use claude, antigravity or all)" ;;
  esac
done

# Self-check when Node is available (installing does not need it): the install matches dist/ byte for byte and the
# git guard works, or (after --uninstall) nothing FORGE installed is left behind.
if [ "$DRY" != 1 ] && command -v node >/dev/null 2>&1; then
  vflags=(--target "$TARGET" --scope "$SCOPE" --project "$PROJECT"); [ "$MODE" = "uninstall" ] && vflags+=(--absent)
  node "$REPO_DIR/scripts/verify-install.mjs" "${vflags[@]}" || die "verification failed (see above)"
fi

if [ "$MODE" = "install" ] && [ "$DRY" != 1 ]; then
  cat <<'EOF'

Next steps
  • Restart Claude Code / Antigravity (or start a new session) so the skills and agents load.
  • Run:  /forge <what you want done>      e.g.  /forge Fix the payment issue
  • Optional browser QA (recommended for web apps):
      claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --redactNetworkHeaders
      claude mcp add playwright -- npx @playwright/mcp@latest
    (Antigravity: add the same servers to ~/.gemini/config/mcp_config.json — see docs/installation.md)
  • FORGE never commits, pushes or opens pull requests.
EOF
fi
