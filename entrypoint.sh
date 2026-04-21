#!/bin/sh
set -e

max_retries="${DB_SEED_MAX_RETRIES:-30}"
retry_delay="${DB_SEED_RETRY_DELAY:-2}"

run_with_retries() {
  command_name="$1"
  attempt=1

  echo "[entrypoint] Running ${command_name}..."
  until npm run "${command_name}"; do
    if [ "$attempt" -ge "$max_retries" ]; then
      echo "[entrypoint] ${command_name} failed after $max_retries attempts." >&2
      exit 1
    fi

    echo "[entrypoint] ${command_name} failed (attempt $attempt/$max_retries). Retrying in ${retry_delay}s..."
    attempt=$((attempt + 1))
    sleep "$retry_delay"
  done
}

run_with_retries "db:push"
run_with_retries "db:seed"

echo "[entrypoint] Database setup completed. Starting Next.js..."
exec npm run start
