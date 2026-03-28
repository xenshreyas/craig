#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '[deploy] %s\n' "$1"
}

run_step() {
  log "$1"
  shift
  "$@"
}

cd "$SCRIPT_DIR"

run_step "Running forced installer" ./install.sh -f

run_step "Building bot" yarn workspace craig-bot build
run_step "Building dashboard" yarn workspace craig-dashboard build
run_step "Building download" yarn workspace craig-horse build
run_step "Building tasks" yarn workspace craig-tasks build

run_step "Restarting PM2 processes" pm2 restart all --update-env
run_step "Saving PM2 process list" pm2 save

log "Deploy completed successfully."
