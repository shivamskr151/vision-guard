#!/bin/sh

# Recreate config file
rm -rf /usr/share/nginx/html/env-config.js
touch /usr/share/nginx/html/env-config.js

# Add assignment 
echo "window.env = {" >> /usr/share/nginx/html/env-config.js

# Read each line in .env file
# Each line represents key=value pair
# We only want VITE_ variables
printenv | grep VITE_ | awk -F = '{ print "  \"" $1 "\": \"" $2 "\"," }' >> /usr/share/nginx/html/env-config.js || true

echo "}" >> /usr/share/nginx/html/env-config.js
