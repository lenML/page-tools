#!/bin/bash
set -e

if [ ! -d dist ]; then
    mkdir dist
fi
cp index.html dist
cp app.js dist
