#!/usr/bin/env bash
set -euo pipefail

COMMIT_MSG=${1:-"Update site"}

# ensure repo is clean from unfinished operations
if [[ -f .git/MERGE_HEAD || -d .git/rebase-apply || -d .git/rebase-merge || -f .git/CHERRY_PICK_HEAD ]]; then
  echo "Git operation in progress (merge/rebase/cherry-pick). Finish or abort it, then rerun deploy."
  exit 1
fi

git fetch origin
git checkout dev

STASHED=0
if [[ -n "$(git status --porcelain)" ]]; then
  git stash push -u -m "pre-deploy"
  STASHED=1
fi

git pull --rebase origin dev

if [[ $STASHED -eq 1 ]]; then
  git stash pop
  if [[ -n "$(git ls-files -u)" ]]; then
    echo "Stash pop caused conflicts. Resolve conflicts, then rerun deploy."
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

echo "✅ Deployed commit: $(git rev-parse --short HEAD) on main"
