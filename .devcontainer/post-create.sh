#!/bin/sh

# Mark the working directory as safe for use with git
git config --global --add safe.directory $PWD

# If there is no dev.js file, create it
if [ ! -f dev.js ]; then
  cp -a .devcontainer/dev.js .
fi

# Install packages for the server
if [ -f package.json ]; then
    npm ci
fi

# Install packages and build the client
if [ -f client/package.json ]; then
    (cd client; npm ci; npm run generate)
fi 
