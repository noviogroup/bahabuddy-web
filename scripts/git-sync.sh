#!/usr/bin/env bash
# Pull latest from origin, then push local commits. Keeps main in sync with remote.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REMOTE="${SYNC_REMOTE:-origin}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "→ Syncing ${BRANCH} with ${REMOTE}..."

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "✗ Not a git repository."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Uncommitted changes — commit or stash before syncing."
  git status -sb
  exit 1
fi

git fetch "$REMOTE"

LOCAL="$(git rev-parse HEAD)"
REMOTE_REF="${REMOTE}/${BRANCH}"

if git show-ref --verify --quiet "refs/remotes/${REMOTE_REF}"; then
  UPSTREAM="$(git rev-parse "${REMOTE_REF}")"
else
  echo "→ No upstream ${REMOTE_REF} yet — will push to create it."
  UPSTREAM=""
fi

if [ -n "$UPSTREAM" ] && [ "$LOCAL" != "$UPSTREAM" ]; then
  if git merge-base --is-ancestor "$LOCAL" "$UPSTREAM" 2>/dev/null; then
    BEHIND="$(git rev-list --count HEAD.."${REMOTE_REF}")"
    echo "→ Pulling ${BEHIND} commit(s)..."
    git pull "$REMOTE" "$BRANCH" --rebase
  elif git merge-base --is-ancestor "$UPSTREAM" "$LOCAL" 2>/dev/null; then
    AHEAD="$(git rev-list --count "${REMOTE_REF}"..HEAD)"
    echo "→ ${AHEAD} local commit(s) to push..."
  else
    BEHIND="$(git rev-list --count HEAD.."${REMOTE_REF}" 2>/dev/null || echo 0)"
    AHEAD="$(git rev-list --count "${REMOTE_REF}"..HEAD 2>/dev/null || echo 0)"
    echo "→ Branch diverged (${BEHIND} behind, ${AHEAD} ahead) — rebasing..."
    git pull "$REMOTE" "$BRANCH" --rebase
  fi
else
  echo "→ Already up to date with ${REMOTE}/${BRANCH}."
fi

if git show-ref --verify --quiet "refs/remotes/${REMOTE_REF}"; then
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse "${REMOTE_REF}")" ]; then
    echo "→ Pushing to ${REMOTE}/${BRANCH}..."
    git push "$REMOTE" "$BRANCH"
  fi
else
  echo "→ Pushing to ${REMOTE}/${BRANCH}..."
  git push -u "$REMOTE" "$BRANCH"
fi

echo "✓ Sync complete."
git status -sb
