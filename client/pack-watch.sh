#!/bin/bash
rm -R ./public/dist
npx webpack --config webpack.config.js --mode development --watch --progress --display errors-only