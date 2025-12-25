#!/usr/bin/env bash
set -euo pipefail

COMMIT_MSG=${1:-"Update site"}

# ensure repo is clean from unfinished operations
for state in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD; do
  if [[ -f ".git/$state" ]]; then
    echo "Repository is in the middle of another operation ($state). Resolve it first."
    exit 1
  fi
done

git fetch origin
git checkout dev

STASHED=false
if [[ -n "$(git status --porcelain)" ]]; then
  git stash push -u -m "pre-deploy"
  STASHED=true
fi

git pull --rebase origin dev

if [[ "$STASHED" == true ]]; then
  if ! git stash pop; then
    echo "Stash pop caused conflicts. Resolve, then rerun deploy."
    exit 1
  fi
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "$COMMIT_MSG"
fi

git push origin dev

git checkout main
git pull --rebase origin main
git merge --no-ff dev -m "Deploy: merge dev into main"
git push origin main
