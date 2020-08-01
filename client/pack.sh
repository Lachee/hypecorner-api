#!/bin/bash
rm -R ./public/dist
npx webpack --config webpack.config.js --mode production --progress  --display errors-only