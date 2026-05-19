#!/usr/bin/env bash
# Block git commit/push/merge on protected branches (main, dev) when invoked via Claude.
# Lefthook + GitHub branch protection cover non-Claude paths.
#
# stdin: Claude PreToolUse JSON event, e.g.
#   {"tool":"Bash","tool_input":{"command":"git commit -m '...'"},"cwd":"..."}
# exit 0 = allow; exit 2 = block (Claude surfaces stderr to the user).

set -euo pipefail

PROTECTED_RE='^(main|dev)$'

cmd=$(python3 - <<'PY' 2>/dev/null || true
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("")
    sys.exit(0)
ti = data.get("tool_input") or {}
print(ti.get("command", ""))
PY
)

# Only act on git mutation commands we want to gate.
case "$cmd" in
    *"git commit"*|*"git push"*|*"git merge"*|*"git rebase"*)
        # detect repo root from cwd; bail silently if not in a repo
        if ! branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); then
            exit 0
        fi
        if [[ "$branch" =~ $PROTECTED_RE ]]; then
            cat >&2 <<EOF
[guard-protected-branch] BLOCKED on '$branch'.
  Command: $cmd
  Rule: gongsiri 컨벤션상 main·dev 에서는 직접 commit/push/merge 금지.
  Action: feature/<owner>-<scope> 로 분기 후 다시 시도.
    예) git checkout -b feature/C-fix-xyz
EOF
            exit 2
        fi
        ;;
esac
exit 0
