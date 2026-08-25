#!/usr/bin/env bash
#
# install-autosync.sh - make sync.sh run on its own, via launchd.
#
#   bash tools/install-autosync.sh            install, checks every 60s
#   bash tools/install-autosync.sh 300        install, checks every 5 min
#   bash tools/install-autosync.sh off        uninstall
#
# The agent runs sync.sh in --push-only mode: it delivers commits that already
# exist and never creates one. So a Cowork session can commit with a real
# message, and this picks it up and pushes within a minute.
#
# That means work in progress stays local. Only something deliberately
# committed reaches the live site, which is the important difference from the
# old auto-sync that committed everything on a timer.
#
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="co.oricohen.portfolio-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/oricohen-portfolio-sync.log"
INTERVAL="${1:-60}"

if [ "$INTERVAL" = "off" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null \
    || launchctl unload "$PLIST" 2>/dev/null
  rm -f "$PLIST"
  echo "auto-sync uninstalled."
  echo "You can still sync by hand: bash $REPO/tools/sync.sh"
  exit 0
fi

case "$INTERVAL" in
  ''|*[!0-9]*) echo "Interval must be a number of seconds, or 'off'."; exit 1 ;;
esac
[ "$INTERVAL" -lt 60 ] && { echo "Use 60 seconds or more."; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$(dirname "$LOG")"

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>              <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/tools/sync.sh</string>
    <string>--push-only</string>
  </array>
  <key>WorkingDirectory</key>   <string>$REPO</string>
  <key>StartInterval</key>      <integer>$INTERVAL</integer>
  <key>RunAtLoad</key>          <false/>
  <key>StandardOutPath</key>    <string>$LOG</string>
  <key>StandardErrorPath</key>  <string>$LOG</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>ProcessType</key>        <string>Background</string>
</dict>
</plist>
PLISTEOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null \
   || launchctl load "$PLIST" 2>/dev/null; then
  echo "auto-sync installed. Runs every $INTERVAL seconds."
  echo ""
  echo "  watch the log:  tail -f $LOG"
  echo "  run it now:     bash $REPO/tools/sync.sh"
  echo "  turn it off:    bash $REPO/tools/install-autosync.sh off"
else
  echo "launchctl refused to load the agent."
  echo "The plist is at $PLIST - you may need to grant Terminal"
  echo "Full Disk Access in System Settings > Privacy & Security."
  exit 1
fi
