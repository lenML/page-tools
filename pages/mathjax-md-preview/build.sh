
# 如果 dist 文件夹不存在就创建
if [ ! -d dist ]; then
    mkdir dist
fi

# 复制 index.html 到 dist
cp index.html dist
