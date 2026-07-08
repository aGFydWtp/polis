#!/bin/sh
set -e

# Set default values for ports
export API_SERVER_PORT=${API_SERVER_PORT:-5000}
export AUTH_SIMULATOR_PORT=${AUTH_SIMULATOR_PORT:-3000}

# Replace environment variables in the Nginx config
envsubst '${API_SERVER_PORT} ${AUTH_SIMULATOR_PORT}' </etc/nginx/conf.d/default.conf.template >/etc/nginx/conf.d/default.conf

# Execute the original Docker entrypoint with the provided arguments
exec "$@"
