#!/usr/bin/env bash
# Push the app-signing secrets from local files/env into a GitHub repo's
# Actions secrets (personal accounts have no account-wide secrets, so each
# consuming repo gets its own copy). Values are read from the environment and
# piped to `gh secret set`; nothing is echoed.
#
# Usage:
#   scripts/sync-app-secrets.sh --env-file .env     # vars as in .env.example
# or, with the variables already exported:
#   scripts/sync-app-secrets.sh [--repo owner/name]
#                               [--ios-only|--android-only|--play-only|--vite-only]
#                               [--env-file FILE]...
#
# --env-file reads KEY=value files literally (see .env.example). Their values
# win over the shell environment.
# Without --repo, the current directory's GitHub repo is used.
set -euo pipefail

# KEY=value lines, read literally (no shell expansion, so passwords may hold
# $ or spaces; one pair of surrounding quotes is stripped). An explicit env
# file wins over variables already exported in the shell.
load_env() {
  [[ -r "$1" ]] || { echo "cannot read env file: $1" >&2; exit 2; }
  local key value
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    key="${key//[[:space:]]/}"
    [[ -z "$key" || "$key" == \#* ]] && continue
    [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]] && value="${BASH_REMATCH[1]}"
    export "$key=$value"
  done < "$1"
}

repo=() ios=1 android=1 play=1 vite=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) repo=(--repo "$2"); shift 2 ;;
    --ios-only) android=0; play=0; vite=0; shift ;;
    --android-only) ios=0; play=0; vite=0; shift ;;
    --play-only) ios=0; android=0; vite=0; shift ;;
    --vite-only) ios=0; android=0; play=0; shift ;;
    --env-file) load_env "${2/#\~/$HOME}"; shift 2 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

need() {
  for v in "$@"; do
    [[ -n "${!v:-}" ]] || { echo "missing env var: $v" >&2; exit 2; }
  done
}

need_file() {
  [[ -r "${1/#\~/$HOME}" && -s "${1/#\~/$HOME}" ]] || { echo "not a readable file: $1" >&2; exit 2; }
}

# An empty --body makes gh prompt interactively; refuse instead.
set_secret() {
  [[ -n "$2" ]] || { echo "empty value for $1" >&2; exit 2; }
  gh secret set "$1" "${repo[@]}" --body "$2" >/dev/null && echo "set $1"
}

if (( ios )); then
  need ASC_KEY_PATH ASC_KEY_ID ASC_ISSUER_ID
  need_file "$ASC_KEY_PATH"
  grep -q -- '-----BEGIN PRIVATE KEY-----' "${ASC_KEY_PATH/#\~/$HOME}" \
    || { echo "ASC_KEY_PATH is not an App Store Connect .p8 key: $ASC_KEY_PATH" >&2; exit 2; }
  set_secret ASC_KEY_P8 "$(base64 < "${ASC_KEY_PATH/#\~/$HOME}" | tr -d '\n')"
  set_secret ASC_KEY_ID "$ASC_KEY_ID"
  set_secret ASC_ISSUER_ID "$ASC_ISSUER_ID"
fi

if (( android )); then
  need ANDROID_KEYSTORE_PATH ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD
  need_file "$ANDROID_KEYSTORE_PATH"
  set_secret ANDROID_KEYSTORE "$(base64 < "${ANDROID_KEYSTORE_PATH/#\~/$HOME}" | tr -d '\n')"
  set_secret ANDROID_KEYSTORE_PASSWORD "$ANDROID_KEYSTORE_PASSWORD"
  set_secret ANDROID_KEY_ALIAS "$ANDROID_KEY_ALIAS"
  set_secret ANDROID_KEY_PASSWORD "$ANDROID_KEY_PASSWORD"
fi

if (( play )); then
  need GOOGLE_PLAY_JSON_KEY_PATH
  need_file "$GOOGLE_PLAY_JSON_KEY_PATH"
  key="${GOOGLE_PLAY_JSON_KEY_PATH/#\~/$HOME}"
  # The upload action takes the JSON verbatim, so sanity-check it is a
  # service-account key rather than, say, an OAuth client file.
  grep -q '"private_key"' "$key" \
    || { echo "GOOGLE_PLAY_JSON_KEY_PATH is not a service-account JSON key: $GOOGLE_PLAY_JSON_KEY_PATH" >&2; exit 2; }
  set_secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON "$(cat "$key")"
fi

if (( vite )); then
  # Build-time VITE_* values are baked into the web bundle by CI. Only the
  # OpenAIP key is mandatory; unset/empty broker settings are skipped (an empty
  # secret cannot be stored, and CI treats a missing one as empty).
  need VITE_OPENAIP_KEY
  set_secret VITE_OPENAIP_KEY "$VITE_OPENAIP_KEY"
  for v in VITE_MQTT_BROKER_URL VITE_MQTT_BROKER_USER VITE_MQTT_BROKER_PASSWORD VITE_MQTT_BROKER_PORT; do
    if [[ -n "${!v:-}" ]]; then set_secret "$v" "${!v}"; else echo "skip $v (empty)"; fi
  done
fi
