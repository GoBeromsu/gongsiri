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
    gh api -X PUT "repos/$repo/branches/$branch/protection" \
        -H "Accept: application/vnd.github+json" \
        -F required_status_checks=null \
        -F enforce_admins=false \
        -F required_pull_request_reviews.required_approving_review_count=1 \
        -F required_pull_request_reviews.dismiss_stale_reviews=false \
        -F required_pull_request_reviews.require_code_owner_reviews=false \
        -F restrictions=null \
        -F allow_force_pushes=false \
        -F allow_deletions=false \
        -F required_linear_history=false \
        -F required_conversation_resolution=false \
        > /dev/null
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
