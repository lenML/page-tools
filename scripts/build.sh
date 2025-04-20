#!/bin/bash

set -e

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DIST_DIR="${ROOT_DIR}/dist"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 到 pages 目录下遍历所有 pages 子目录，执行 bash.sh
# 并将结果 dist 文件夹移动到 根目录下的 dist/<page-dir-name>
for dir in $(find pages -mindepth 1 -maxdepth 1 -type d); do
    echo "🐱build $dir"
    cd "$dir"
    bash build.sh
    mv ./dist/ "$DIST_DIR/$(basename "$dir")/"
    cd "$ROOT_DIR"
    echo "🐱build $dir success"
done

cd $ROOT_DIR
# copy ./public 静态文件 暂时不复制 因为没有会报错...
# cp -r ./public/* "$DIST_DIR/"
# copy ./README.md
cp ./README.md "$DIST_DIR/"

echo "🚀build success"
