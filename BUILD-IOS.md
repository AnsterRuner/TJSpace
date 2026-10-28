# 构建未签名 IPA

TJSpace 的界面是纯静态 Web（`app/`），通过 **Capacitor** 套一层原生 WebView 外壳，
由 Xcode 编译成 `.ipa`。

> **关键前提：IPA 里的主程序是 Xcode 编译出的 arm64 Mach-O 二进制，
> 只能在 macOS + Xcode 上产出。** Windows / Linux 无法编译 iOS 应用，
> 必须走 macOS 本机或 GitHub Actions 的 macOS runner。

---

## 方式一：GitHub Actions（推荐，零 macOS 依赖）

1. 在 GitHub 新建一个仓库，把本目录（不含 `node_modules/`、`build/`）推上去：

   ```bash
   git init
   git add .
   git commit -m "TJSpace v0.1.0"
   git branch -M main
   git remote add origin git@github.com:<你的账号>/tjspace.git
   git push -u origin main
   ```

2. 打开仓库 **Actions** 标签 → 左侧选 **Build unsigned IPA** → 右侧 **Run workflow**。

3. 约 5–8 分钟后，在该次运行页面底部 **Artifacts** 下载
   `TJSpace-unsigned-ipa.zip`，解压得到 `TJSpace-unsigned.ipa`。

也可以打 tag 自动触发：`git tag v0.1.0 && git push --tags`。

---

## 方式二：本机 macOS

需要 Xcode（App Store 安装）与 Node 18+。

```bash
cd TJSpace
npm install
bash scripts/build-ios.sh
```

首次运行会自动执行 `npx cap add ios` 生成 `ios/` 原生工程，
之后每次只需 `cap sync ios` 同步 `app/` 里的改动。

产物：`./TJSpace-unsigned.ipa`

手动分步执行等价于：

```bash
npx cap add ios            # 仅首次
npx cap sync ios           # 把 app/ 拷进 ios/App/App/public/
cd ios/App && pod install  # 若使用 CocoaPods
cd ../..

xcodebuild -project ios/App/App.xcodeproj \
  -scheme App -configuration Release -sdk iphoneos \
  -destination "generic/platform=iOS" \
  -archivePath build/TJSpace.xcarchive \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO \
  CODE_SIGN_ENTITLEMENTS="" DEVELOPMENT_TEAM="" ARCHS=arm64 archive

mkdir -p build/stage/Payload
cp -R build/TJSpace.xcarchive/Products/Applications/App.app build/stage/Payload/
cd build/stage && zip -qry ../../TJSpace-unsigned.ipa Payload
```

---

## 装到 iPhone 上

未签名 IPA **不能直接双击安装**，iOS 只接受有签名的包。需要重签：

| 工具 | 平台 | 说明 |
| --- | --- | --- |
| **Sideloadly** | Win / macOS | 最省事，用 Apple ID 免费证书重签，7 天有效 |
| **AltStore** | Win / macOS | 自带 7 天自动续签 |
| **TrollStore** | 设备端 | 仅限特定 iOS 版本，装完永久有效 |
| **Xcode** | macOS | `Devices and Simulators` 里直接拖入，需开发者账号 |

免费 Apple ID 签名的应用有效期 7 天，到期需重新签一次；
付费开发者账号（$99/年）为 1 年。

---

## 目录结构

```
TJSpace/
├── app/                     # 纯静态前端（可直接双击 index.html 预览）
│   ├── index.html
│   ├── css/{tokens,app,platform}.css
│   └── js/{util,holidays,store,todo,ai,me,app}.js
├── capacitor.config.json    # appId / appName / webDir=app
├── package.json
├── scripts/build-ios.sh     # macOS 一键构建
├── .github/workflows/ios-unsigned.yml
└── ios/                     # 由 npx cap add ios 生成（可提交，也可交给 CI 生成）
```

## 原生外壳配置

`capacitor.config.json` 中：

- `webDir: "app"` —— 直接指向现有前端目录，改代码后 `cap sync ios` 即可
- `ios.contentInset: "never"` + `scrollEnabled: false` —— 页面铺满全屏，
  安全区由 CSS 的 `env(safe-area-inset-*)` 自行处理
- `ios.backgroundColor: "#F6F7F9"` —— 与浅色主题背景一致，避免启动闪白/闪黑

修改 `appName` 或 `appId` 后需重新 `cap sync ios`，并清理 `ios/` 重新生成。
