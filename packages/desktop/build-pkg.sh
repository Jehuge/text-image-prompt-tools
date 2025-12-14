#!/bin/bash

# 构建 macOS PKG 安装包（支持 x64 和 arm64）
# 使用方法: ./build-pkg.sh

set -e

echo "📦 开始构建 macOS PKG 安装包..."

# 1. 构建应用
echo "1️⃣ 构建应用..."
pnpm build

# 2. 清理 release 目录中的临时文件（保留已构建的 app）
echo "2️⃣ 清理临时文件..."
rm -f packages/desktop/release/distribution.xml 2>/dev/null || true
rm -f packages/desktop/release/*.pkg 2>/dev/null || true

# # 3. 构建 x64 架构
# echo "3️⃣ 构建 x64 架构..."
# pnpm --filter @text-image-prompt-tools/desktop build:pkg:x64

# 4. 清理 distribution.xml（如果存在）
rm -f packages/desktop/release/distribution.xml 2>/dev/null || true

# 5. 构建 arm64 架构
echo "4️⃣ 构建 arm64 架构..."
pnpm --filter @text-image-prompt-tools/desktop build:pkg:arm64

echo "✅ 构建完成！"
echo "📦 PKG 文件位置:"
ls -lh packages/desktop/release/*.pkg 2>/dev/null || echo "  未找到 PKG 文件"


