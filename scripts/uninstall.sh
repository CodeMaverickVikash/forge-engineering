#!/usr/bin/env bash
# Removes FORGE files listed in the install manifest. Accepts the same --target/--scope/--project/--dry-run flags as install.sh.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.sh" --uninstall "$@"
