#!/usr/bin/env bash
#
# sync.sh - commit and push whatever changed in this repo.
#
#   bash tools/sync.sh                  auto-generated commit message
#   bash tools/sync.sh "your message"   your own message
#
# Tracked in git on purpose. The old .cowork-sync.sh was gitignored, which is
# exactly why it vanished when the repo was cloned onto a new machine. This one
# holds no secrets - auth comes from the gh credential helper - so it is safe
# to commit.
#
# Exits 0 when there was nothing to do, so it is safe to run on a timer.
#
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1

# launchd hands us a minimal PATH. Make sure git and gh are reachable.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"; }
die() { log "ERROR: $1"; exit 1; }

command -v git >/dev/null || die "git not found on PATH"

# ---------------------------------------------------------------------------
# --push-only: deliver commits that already exist, never create one.
#
# This is the mode the launchd timer runs in. Claude commits with a real
# message from the Cowork session but cannot push (the sandbox has no network
# route to github.com and no credentials). The timer picks the commit up and
# delivers it. Uncommitted edits are deliberately left alone, so work in
# progress never gets swept into a junk commit and nothing half-finished
# reaches the live site.
# ---------------------------------------------------------------------------
PUSH_ONLY=0
if [ "${1:-}" = "--push-only" ]; then
  PUSH_ONLY=1
  shift
fi

# ---------------------------------------------------------------------------
# Clear a stale index.lock. A Cowork session editing files through the FUSE
# mount can leave one behind. Only safe to remove when no git is running.
# ---------------------------------------------------------------------------
if [ -f .git/index.lock ]; then
  if pgrep -x git >/dev/null 2>&1; then
    die "another git process is running - not touching index.lock"
  fi
  rm -f .git/index.lock && log "cleared a stale .git/index.lock"
fi

# ---------------------------------------------------------------------------
# Nothing to do?
# ---------------------------------------------------------------------------
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "HEAD" ] && die "detached HEAD - check out a branch first"

DIRTY="$(git status --porcelain)"
if git rev-parse --verify -q "refs/remotes/origin/$BRANCH" >/dev/null; then
  UNPUSHED="$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo 1)"
else
  # Branch is not on the remote yet, so there is definitely something to push.
  UNPUSHED=1
fi

if [ "$PUSH_ONLY" -eq 1 ]; then
  if [ "$UNPUSHED" -eq 0 ]; then
    log "nothing committed to push"
    exit 0
  fi
  [ -n "$DIRTY" ] && log "note: uncommitted edits present, leaving them alone"
elif [ -z "$DIRTY" ] && [ "$UNPUSHED" -eq 0 ]; then
  log "clean and in sync - nothing to do"
  exit 0
fi

# ---------------------------------------------------------------------------
# Commit local changes
# ---------------------------------------------------------------------------
if [ -n "$DIRTY" ] && [ "$PUSH_ONLY" -eq 0 ]; then
  MSG="${1:-Cowork auto-sync [$(date '+%H:%M %d/%m')]}"
  git add -A || die "git add failed"
  git commit -q -m "$MSG" || die "git commit failed"
  log "committed: $MSG"
else
  log "$UNPUSHED local commit(s) waiting to push"
fi

# ---------------------------------------------------------------------------
# Rebase onto the remote before pushing.
#
# This is the fix for the old workflow's biggest wart. Previously the remote
# would diverge and every sync ended in `push --force`, which silently
# discards whatever was on the remote. Rebasing replays local work on top of
# the remote instead, so a plain push works and nothing gets thrown away.
# ---------------------------------------------------------------------------
git fetch -q origin || die "fetch failed - check your network"

# If the branch does not exist on the remote yet there is nothing to rebase
# onto, so skip straight to the first push.
if git rev-parse --verify -q "refs/remotes/origin/$BRANCH" >/dev/null; then
  if ! git rebase -q --autostash "origin/$BRANCH"; then
    git rebase --abort 2>/dev/null
    die "rebase hit a conflict on '$BRANCH'. Resolve by hand:
       cd $REPO
       git pull --rebase
       (fix conflicts, then: git add . && git rebase --continue)
       bash tools/sync.sh"
  fi
else
  log "origin/$BRANCH does not exist yet - this will be the first push"
fi

# ---------------------------------------------------------------------------
# Push
# ---------------------------------------------------------------------------
if git push -q -u origin "$BRANCH"; then
  log "pushed -> $(git rev-parse --short HEAD)"
  log "GitHub Pages will redeploy in about a minute"
else
  die "push failed. Check auth with: gh auth status"
fi
