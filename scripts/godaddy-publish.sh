#!/usr/bin/env bash
# Publish this repo to GoDaddy Node.js Hosting.
# Requires GDDY_PAT (GoDaddy personal access token).
# Optional: GODADDY_APP_ID, GODADDY_APP_NAME, GODADDY_PUBLISH=1, GODADDY_DOMAIN=medihome.co.in
set -euo pipefail

export PATH="${HOME}/.local/bin:${PATH}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${GDDY_PAT:-}" ]]; then
  echo "Set GDDY_PAT (GoDaddy personal access token) and re-run." >&2
  exit 1
fi

if ! command -v gddy >/dev/null 2>&1; then
  curl -fsSL https://github.com/godaddy/cli/releases/latest/download/install.sh | bash
  export PATH="${HOME}/.local/bin:${PATH}"
fi

zip_path="${1:-/tmp/medihome-godaddy.zip}"
rm -f "$zip_path"
(
  cd "$ROOT"
  zip -r "$zip_path" . \
    -x 'node_modules/*' \
    -x 'dist/*' \
    -x '.git/*' \
    -x '.env' \
    -x '.env.*' \
    -x 'android/*' \
    -x 'ios/*' \
    -x '*.log' \
    >/dev/null
)
echo "Zip $(wc -c < "$zip_path") bytes -> $zip_path"

app_id="${GODADDY_APP_ID:-}"
if [[ -z "$app_id" ]]; then
  echo "Creating Node.js app slot…"
  create_json="$(gddy hosting app create --app-type NODEJS --name "${GODADDY_APP_NAME:-MediHome}" --json)"
  echo "$create_json"
  op_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["operationId"])' <<<"$create_json")"
  for _ in $(seq 1 60); do
    op_json="$(gddy hosting operation get --operation-id "$op_id" --json)"
    status="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["status"])' <<<"$op_json")"
    echo "create status=$status"
    if [[ "$status" == "COMPLETED" ]]; then
      app_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["app"]["id"])' <<<"$op_json")"
      break
    fi
    if [[ "$status" == "FAILED" ]]; then
      echo "$op_json" >&2
      exit 1
    fi
    sleep 5
  done
fi

if [[ -z "$app_id" ]]; then
  echo "No app id after create." >&2
  exit 1
fi
echo "Using app $app_id"

upload_json="$(gddy hosting source upload --app-id "$app_id" --file "$zip_path" --json)"
echo "$upload_json"
import_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["importId"])' <<<"$upload_json")"
for _ in $(seq 1 60); do
  st_json="$(gddy hosting source status --app-id "$app_id" --import-id "$import_id" --json)"
  status="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["status"])' <<<"$st_json")"
  echo "import status=$status"
  if [[ "$status" == "COMPLETED" ]]; then
    break
  fi
  if [[ "$status" == "FAILED" ]]; then
    echo "$st_json" >&2
    exit 1
  fi
  sleep 5
done

app_json="$(gddy hosting app get --app-id "$app_id" --json)"
echo "$app_json"

if [[ "${GODADDY_PUBLISH:-}" == "1" ]]; then
  pub_json="$(gddy hosting deployment publish --app-id "$app_id" --json)"
  echo "$pub_json"
  dep_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["deploymentId"])' <<<"$pub_json")"
  for _ in $(seq 1 60); do
    d_json="$(gddy hosting deployment get --app-id "$app_id" --deployment-id "$dep_id" --json)"
    status="$(python3 -c 'import json,sys; d=json.load(sys.stdin); d=d.get("data",d); print(d["status"])' <<<"$d_json")"
    echo "publish status=$status"
    if [[ "$status" == "COMPLETED" || "$status" == "FAILED" ]]; then
      echo "$d_json"
      [[ "$status" == "COMPLETED" ]] || exit 1
      break
    fi
    sleep 8
  done
fi

if [[ -n "${GODADDY_DOMAIN:-}" ]]; then
  gddy hosting domain attach --app-id "$app_id" --hostname "$GODADDY_DOMAIN" --json || true
fi

echo "App id: $app_id"
echo "Save GODADDY_APP_ID=$app_id for the next publish."
echo "Preview URL is in the app get JSON above. Publish and attach medihome.co.in after a hosting plan is linked."
