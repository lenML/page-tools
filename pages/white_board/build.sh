#!/bin/bash
set -e

node ./build_white_board.mjs

if [ ! -d dist ]; then
    mkdir dist
fi
cp index.html dist
