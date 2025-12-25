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

# Push dev if ahead of origin
DEV_AHEAD=$(git log --oneline origin/dev..dev || true)
if [[ -n "$DEV_AHEAD" ]]; then
  git push origin dev
fi

# Check if nothing to deploy (clean, no dev ahead, dev not ahead of main)
DEV_DIRTY=$(git status --porcelain)
DEV_AHEAD_MAIN=$(git log --oneline main..dev || true)
if [[ -z "$DEV_DIRTY" && -z "$DEV_AHEAD" && -z "$DEV_AHEAD_MAIN" ]]; then
  echo "Nothing to deploy"
  exit 0
fi

git checkout main
git pull --rebase origin main
git merge --no-ff dev -m "Deploy: $COMMIT_MSG"
git push origin main

DEV_SHA=$(git rev-parse --short dev)
MAIN_SHA=$(git rev-parse --short main)
echo "✅ Deployed commit: $MAIN_SHA on main"
echo "dev:  $DEV_SHA"
echo "main: $MAIN_SHA"

# Tagging
TODAY=$(date +"%Y.%m.%d")
EXISTING_TAGS_TODAY=$(git tag --list "v${TODAY}-*")
MAX_N=0
if [[ -n "$EXISTING_TAGS_TODAY" ]]; then
  while read -r tag; do
    n=$(echo "$tag" | awk -F- '{print $2}')
    if [[ "$n" =~ ^[0-9]+$ ]] && (( n > MAX_N )); then
      MAX_N=$n
    fi
  done <<< "$EXISTING_TAGS_TODAY"
fi
NEXT_N=$((MAX_N + 1))
NEW_TAG="v${TODAY}-${NEXT_N}"
git tag -a "$NEW_TAG" -m "Release ${NEW_TAG}: $COMMIT_MSG"
git push origin "$NEW_TAG"

# Changelog
LATEST_PREV_TAG=$(git tag --list 'v*' --sort=-v:refname | grep -v "^${NEW_TAG}$" | head -n1 || true)
CHANGELOG=""
if [[ -n "$LATEST_PREV_TAG" ]]; then
  CHANGELOG=$(git log --pretty=format:"- %h %s" "${LATEST_PREV_TAG}..HEAD")
else
  CHANGELOG=$(git log -n 20 --pretty=format:"- %h %s")
fi
echo "Changelog ${NEW_TAG}"
echo "$CHANGELOG"
mkdir -p releases
{
  echo "Changelog ${NEW_TAG}"
  echo "$CHANGELOG"
} > "releases/CHANGELOG_${NEW_TAG}.md"
