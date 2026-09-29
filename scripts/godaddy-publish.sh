#!/usr/bin/env bash
# Cut over this repo to GoDaddy Node.js Hosting at medihome.co.in.
# Requires GDDY_PAT with hosting + DNS scopes (see README).
# Optional: GODADDY_APP_ID, GODADDY_APP_NAME, GODADDY_PUBLISH (default 1),
#           GODADDY_DOMAIN (default medihome.co.in), GODADDY_FIX_DNS (default 1)
set -euo pipefail

export PATH="${HOME}/.local/bin:${PATH}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_NAME="${GODADDY_APP_NAME:-MediHome}"
DOMAIN="${GODADDY_DOMAIN:-medihome.co.in}"
PUBLISH="${GODADDY_PUBLISH:-1}"
FIX_DNS="${GODADDY_FIX_DNS:-1}"
WEBSITE_BUILDER_IP="160.153.0.189"

REQUIRED_SCOPES='hosting.application:read hosting.application:create hosting.source:write hosting.source:read hosting.deployment:execute hosting.subscription:read hosting.subscription:write hosting.domain:read hosting.domain:write domains.domain:read domains.dns:update'

json_get() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
d = json.loads(raw)
if isinstance(d, dict) and "data" in d:
    d = d["data"]
path = sys.argv[1]
cur = d
for part in path.split("."):
    if part == "":
        continue
    if isinstance(cur, list):
        cur = cur[int(part)]
    else:
        cur = cur[part]
if cur is None:
    sys.exit(1)
if isinstance(cur, (dict, list)):
    print(json.dumps(cur))
else:
    print(cur)
' "$1"
}

json_find_app() {
  python3 -c '
import json, sys
name = sys.argv[1].strip().lower()
d = json.loads(sys.stdin.read())
if isinstance(d, dict) and "data" in d:
    d = d["data"]
items = d
if isinstance(d, dict):
    items = d.get("items") or d.get("apps") or []
if not isinstance(items, list):
    items = []
for app in items:
    if str(app.get("name", "")).strip().lower() == name:
        print(app.get("id", ""))
        break
' "$1"
}

json_first_sub_id() {
  python3 -c '
import json, sys
d = json.loads(sys.stdin.read())
if isinstance(d, dict) and "data" in d:
    d = d["data"]
items = d
if isinstance(d, dict):
    items = d.get("items") or []
if not isinstance(items, list):
    sys.exit(0)
for item in items:
    sid = item.get("subscriptionId") or item.get("id") or item.get("subscription_id")
    if sid:
        print(sid)
        break
'
}

wait_status() {
  local label="$1"
  local getter="$2"
  local path="${3:-status}"
  local i status payload
  for i in $(seq 1 60); do
    payload="$($getter)"
    status="$(printf '%s' "$payload" | json_get "$path" || true)"
    echo "$label status=$status" >&2
    if [[ "$status" == "COMPLETED" || "$status" == "ACTIVE" ]]; then
      printf '%s' "$payload"
      return 0
    fi
    if [[ "$status" == "FAILED" ]]; then
      echo "$payload" >&2
      return 1
    fi
    sleep 5
  done
  echo "Timed out waiting for $label" >&2
  echo "$payload" >&2
  return 1
}

if [[ -z "${GDDY_PAT:-}" ]]; then
  echo "Set GDDY_PAT (GoDaddy personal access token) and re-run." >&2
  echo "Create one at https://developer.godaddy.com/personal-access-token with scopes:" >&2
  echo "  $REQUIRED_SCOPES" >&2
  exit 1
fi

if ! command -v gddy >/dev/null 2>&1; then
  curl -fsSL https://github.com/godaddy/cli/releases/latest/download/install.sh | bash
  export PATH="${HOME}/.local/bin:${PATH}"
fi
if ! command -v zip >/dev/null 2>&1; then
  echo "zip is required to pack the app for upload." >&2
  exit 1
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
  echo "Looking for an existing $APP_NAME Node.js app…"
  list_json="$(gddy hosting app list --app-type NODEJS --json || true)"
  echo "$list_json"
  app_id="$(printf '%s' "$list_json" | json_find_app "$APP_NAME" || true)"
fi

if [[ -z "$app_id" ]]; then
  echo "Creating Node.js app slot…"
  create_json="$(gddy hosting app create --app-type NODEJS --name "$APP_NAME" --json)"
  echo "$create_json"
  op_id="$(printf '%s' "$create_json" | json_get operationId)"
  create_done="$(wait_status "create" "gddy hosting operation get --operation-id $op_id --json")"
  app_id="$(printf '%s' "$create_done" | json_get app.id)"
fi

if [[ -z "$app_id" ]]; then
  echo "No app id after create." >&2
  exit 1
fi
echo "Using app $app_id"

echo "Uploading source…"
upload_json="$(gddy hosting source upload --app-id "$app_id" --file "$zip_path" --json)"
echo "$upload_json"
import_id="$(printf '%s' "$upload_json" | json_get importId)"
wait_status "import" "gddy hosting source status --app-id $app_id --import-id $import_id --json" >/dev/null

echo "Attaching a Web Hosting plan if one is free…"
if ! gddy hosting subscription get --app-id "$app_id" --json; then
  sub_json="$(gddy hosting subscription list --hosting-product WEB_HOSTING --json || true)"
  echo "$sub_json"
  sub_id="$(printf '%s' "$sub_json" | json_first_sub_id || true)"
  if [[ -n "$sub_id" ]]; then
    gddy hosting subscription attach --app-id "$app_id" --subscription-id "$sub_id" --json
  else
    echo "No WEB_HOSTING subscription is available. Preview can still work; Publish needs a plan." >&2
    if [[ "$PUBLISH" == "1" ]]; then
      echo "Buy or assign a GoDaddy Web Hosting plan, then re-run with GODADDY_PUBLISH=1." >&2
      exit 1
    fi
  fi
fi

app_json="$(gddy hosting app get --app-id "$app_id" --json)"
echo "$app_json"

if [[ "$PUBLISH" == "1" ]]; then
  echo "Publishing PREVIEW to production…"
  pub_json="$(gddy hosting deployment publish --app-id "$app_id" --json)"
  echo "$pub_json"
  dep_id="$(printf '%s' "$pub_json" | json_get deploymentId)"
  wait_status "publish" "gddy hosting deployment get --app-id $app_id --deployment-id $dep_id --json" >/dev/null
fi

anycast_ip=""
attach_hostname() {
  local host="$1"
  echo "Attaching $host…"
  attach_json="$(gddy hosting domain attach --app-id "$app_id" --hostname "$host" --json)"
  echo "$attach_json"
  domain_id="$(printf '%s' "$attach_json" | json_get domainId || true)"
  if [[ -z "$domain_id" ]]; then
    listed="$(gddy hosting domain list --app-id "$app_id" --json)"
    echo "$listed"
    domain_id="$(python3 -c '
import json, sys
want = sys.argv[1].lower()
d = json.loads(sys.stdin.read())
if isinstance(d, dict) and "data" in d:
    d = d["data"]
items = d if isinstance(d, list) else (d.get("items") or [])
for item in items:
    if str(item.get("hostname", "")).lower() == want:
        print(item.get("id") or item.get("domainId") or "")
        break
' "$host" <<<"$listed")"
  fi
  if [[ -z "$domain_id" ]]; then
    echo "Could not attach or find $host on the app." >&2
    return 1
  fi
  local got
  got="$(wait_status "domain:$host" "gddy hosting domain get --app-id $app_id --domain-id $domain_id --json" verificationStatus)"
  ip="$(printf '%s' "$got" | json_get anycastIp || true)"
  if [[ -n "$ip" ]]; then
    anycast_ip="$ip"
  fi
}

if [[ -n "$DOMAIN" ]]; then
  attach_hostname "$DOMAIN"
  if [[ "$DOMAIN" != www.* ]]; then
    attach_hostname "www.$DOMAIN" || true
  fi
fi

if [[ "$FIX_DNS" == "1" && -n "$DOMAIN" ]]; then
  echo "Current DNS for $DOMAIN:"
  gddy dns list "$DOMAIN" --json || true
  if [[ -n "$anycast_ip" ]]; then
    echo "Pointing $DOMAIN and www at Node anycast $anycast_ip (replaces Website Builder $WEBSITE_BUILDER_IP)…"
    gddy dns set --type A --name @ --data "$anycast_ip" --ttl 600 --replace-conflicting-types "$DOMAIN"
    gddy dns set --type A --name www --data "$anycast_ip" --ttl 600 --replace-conflicting-types "$DOMAIN" || true
  else
    echo "No anycast IP from domain attach yet; GoDaddy may still be issuing SSL." >&2
  fi
fi

echo "App id: $app_id"
echo "Save GODADDY_APP_ID=$app_id for the next publish."

verify_live() {
  local url body code
  for url in "http://$DOMAIN/" "http://www.$DOMAIN/"; do
    code="$(curl -sS -o /tmp/godaddy-live-body --max-time 20 -w '%{http_code}' "$url" || true)"
    body="$(head -c 400 /tmp/godaddy-live-body 2>/dev/null || true)"
    echo "GET $url -> $code"
    echo "$body"
    if printf '%s' "$body" | grep -qi 'error code: 1001'; then
      return 1
    fi
    if printf '%s' "$body" | grep -qi 'MediHome'; then
      return 0
    fi
  done
  return 1
}

if [[ -n "$DOMAIN" && "$PUBLISH" == "1" ]]; then
  echo "Waiting for $DOMAIN to serve MediHome…"
  ok=0
  for _ in $(seq 1 24); do
    if verify_live; then
      ok=1
      break
    fi
    sleep 10
  done
  if [[ "$ok" != "1" ]]; then
    echo "$DOMAIN is not serving the customer app yet (still Website Builder/Cloudflare 1001, or DNS not switched)." >&2
    echo "In GoDaddy: turn off Website Builder for $DOMAIN, then re-run this script." >&2
    exit 1
  fi
  echo "Live check passed: $DOMAIN is serving MediHome."
fi
