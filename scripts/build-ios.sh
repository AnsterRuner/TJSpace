#!/usr/bin/env bash
# ---------------------------------------------------------------
# TJSpace — 未签名 IPA 构建脚本（必须在 macOS + Xcode 环境执行）
#
#   bash scripts/build-ios.sh
#
# 产物：./TJSpace-unsigned.ipa
# 说明：产物不含任何签名，可用 Sideloadly / AltStore / TrollStore 等
#       工具重签后安装到设备。
# ---------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="TJSpace"
SCHEME="App"
PROJECT="ios/App/App.xcodeproj"
BUILD_DIR="$ROOT/build"
ARCHIVE_PATH="$BUILD_DIR/${APP_NAME}.xcarchive"
APP_PATH="$ARCHIVE_PATH/Products/Applications/App.app"
OUT_IPA="$ROOT/${APP_NAME}-unsigned.ipa"

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$1"; }

# 0. 环境检查
step "检查构建环境"
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "✗ 未找到 xcodebuild。未签名 IPA 只能在 macOS + Xcode 上编译。" >&2
  echo "  Windows / Linux 请使用 GitHub Actions（.github/workflows/ios-unsigned.yml）。" >&2
  exit 1
fi
xcodebuild -version

if [ ! -d "$PROJECT" ]; then
  step "首次运行：生成 iOS 原生工程"
  npm install --no-audit --no-fund
  npx cap add ios
fi

# 1. 同步 Web 资源到原生工程
step "同步 Web 资源 (cap sync ios)"
npx cap sync ios

# 2. 依赖：Capacitor 8 使用 Swift Package Manager（无 Podfile），
#    依赖在 xcodebuild 时自动解析；若工程被降级为 CocoaPods 则补一步 pod install。
if [ -f "ios/App/Podfile" ]; then
  step "安装 Pods"
  if command -v pod >/dev/null 2>&1; then
    ( cd ios/App && pod install --repo-update )
  else
    echo "! 未找到 CocoaPods：sudo gem install cocoapods"
  fi
fi

# 3. 编译（关闭全部签名）
step "编译 Release (arm64, CODE_SIGNING_ALLOWED=NO)"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGN_ENTITLEMENTS="" \
  DEVELOPMENT_TEAM="" \
  ENABLE_BITCODE=NO \
  ONLY_ACTIVE_ARCH=NO \
  ARCHS=arm64 \
  archive

if [ ! -d "$APP_PATH" ]; then
  echo "✗ 编译产物不存在：$APP_PATH" >&2
  exit 1
fi

# 4. 打包成 IPA（Payload/App.app 的 zip）
step "打包 IPA"
STAGE="$BUILD_DIR/stage"
mkdir -p "$STAGE/Payload"
cp -R "$APP_PATH" "$STAGE/Payload/"
# 清掉可能残留的签名文件
rm -rf "$STAGE/Payload/App.app/_CodeSignature" 2>/dev/null || true
rm -f  "$STAGE/Payload/App.app/embedded.mobileprovision" 2>/dev/null || true

rm -f "$OUT_IPA"
( cd "$STAGE" && zip -qry "$OUT_IPA" Payload )

step "完成"
echo "产物：$OUT_IPA"
echo "大小：$(du -h "$OUT_IPA" | cut -f1)"
echo
echo "校验（可执行文件架构应为 arm64）："
file "$APP_PATH/App" || true
