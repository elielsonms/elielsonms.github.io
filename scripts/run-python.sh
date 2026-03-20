#!/usr/bin/env sh

set -eu

if [ -x ".venv/bin/python3" ]; then
  exec .venv/bin/python3 "$@"
fi

exec python3 "$@"
