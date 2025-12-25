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

# If after stash/pop/pull there is nothing to do, exit
if [[ -z "$(git status --porcelain)" ]]; then
  echo "Nothing to deploy"
  exit 0
fi

# Optional lint and typecheck
if npm run | grep -q "lint"; then
  npm run lint
else
  echo "lint skipped"
fi
if npm run | grep -q "typecheck"; then
  npm run typecheck
else
  echo "typecheck skipped"
fi

git push origin dev

git checkout main
git pull --rebase origin main
git merge --no-ff dev -m "Deploy: $COMMIT_MSG"
git push origin main

DEV_SHA=$(git rev-parse --short dev)
MAIN_SHA=$(git rev-parse --short main)
echo "✅ Deployed commit: $MAIN_SHA on main"
echo "dev:  $DEV_SHA"
echo "main: $MAIN_SHA"
