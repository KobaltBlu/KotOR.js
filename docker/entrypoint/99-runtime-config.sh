#!/bin/sh
set -eu

: "${RUNTIME_BASE_PATH:=}"

normalize_base_path() {
  v="$(printf '%s' "$1" | tr -d '\r' | sed -e 's/[[:space:]]\+$//' -e 's/^[[:space:]]\+//')"
  if [ -z "$v" ] || [ "$v" = "/" ]; then
    printf '%s' ""
    return
  fi
  case "$v" in
    /*) ;;
    *) v="/$v" ;;
  esac
  # Remove trailing slash.
  v="$(printf '%s' "$v" | sed -e 's:/*$::')"
  printf '%s' "$v"
}

BASE_PATH="$(normalize_base_path "$RUNTIME_BASE_PATH")"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.RUNTIME_CONFIG = Object.assign(
  {
    basePath: "${BASE_PATH}"
  },
  window.RUNTIME_CONFIG || {}
);
EOF

mkdir -p /etc/nginx/conf.d/snippets

SNIPPET_FILE="/etc/nginx/conf.d/snippets/10-base-path.conf"
rm -f "$SNIPPET_FILE"

# If a base path is configured, support requests that include the prefix by stripping it
# before routing to the static files.
if [ -n "$BASE_PATH" ]; then
  cat > "$SNIPPET_FILE" <<EOF
location = ${BASE_PATH} {
  return 301 ${BASE_PATH}/;
}

location ^~ ${BASE_PATH}/ {
  rewrite ^${BASE_PATH}/(.*)$ /\$1 last;
}
EOF
fi


