#!/usr/bin/env bash
# Apply GitHub branch protection to main and dev on the gongsiri repo.
# Requires: gh CLI authenticated with repo admin scope.
# Idempotent: re-running overwrites the same rules.

set -euo pipefail

require() {
    command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }
}
require gh
require git

# Auto-detect owner/repo from the origin remote
origin_url=$(git config --get remote.origin.url)
# Supports https and ssh forms
repo=$(echo "$origin_url" \
    | sed -E 's#^.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')

if [[ -z "$repo" || "$repo" == "$origin_url" ]]; then
    echo "could not parse owner/repo from: $origin_url" >&2
    exit 1
fi

echo "applying branch protection to: $repo"

protect() {
    local branch=$1
    echo "  → $branch"
    # GitHub's protection PUT requires nested JSON; gh's -F flattens dotted
    # keys into form fields and is rejected with HTTP 422. Pipe a proper
    # JSON body via stdin instead.
    gh api -X PUT "repos/$repo/branches/$branch/protection" \
        -H "Accept: application/vnd.github+json" \
        --input - > /dev/null <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false,
  "required_conversation_resolution": false
}
JSON
}

protect main
protect dev

echo
echo "verifying:"
for b in main dev; do
    printf "  %s: " "$b"
    gh api "repos/$repo/branches/$b/protection" \
        --jq '{require_pr: .required_pull_request_reviews.required_approving_review_count, force_push: .allow_force_pushes.enabled, delete: .allow_deletions.enabled}' \
        | tr -d '\n'
    echo
done

echo
echo "done."
