# 构建未签名 IPA

TJSpace 的界面是纯静态 Web（`app/`），通过 **Capacitor 8** 套一层原生 WKWebView 外壳，
再由 Xcode 编译成 `.ipa`。

> **关键前提：IPA 里的主程序是 Xcode 编译出的 arm64 Mach-O 二进制，
> 只能在 macOS + Xcode 上产出。** Windows / Linux 没有 iOS SDK，
> 无法编译 iOS 应用，必须走 macOS 本机或 GitHub Actions 的 macOS runner。

---

## 现状：还差什么

| 环节 | 状态 |
| --- | --- |
| Web 前端 `app/` | ✅ 完成（可直接双击 `index.html` 预览） |
| Capacitor 配置 + 依赖 | ✅ 完成（`capacitor.config.json`、`package.json`） |
| iOS 原生工程 `ios/` | ✅ 已生成（`npx cap add ios`，含共享 scheme） |
| 应用图标 / 启动图 | ✅ 已生成（`scripts/make-icons.py`） |
| 原生适配（安全区、状态栏、CORS） | ✅ 完成（`app/css/native.css`、`app/js/native.js`） |
| 构建脚本 + CI 工作流 | ✅ 完成（`scripts/build-ios.sh`、`.github/workflows/`） |
| **编译出 `TJSpace-unsigned.ipa`** | ⬜ 需要在 macOS 上跑一次（见下） |

也就是说，**除最后一步编译，其余全部就绪**。仓库已 `git init` 并提交，
推到 GitHub 点一下就能拿到 IPA。

---

## 方式一：GitHub Actions（推荐，无需 Mac）

```bash
cd TJSpace
git remote add origin git@github.com:<你的账号>/tjspace.git
git push -u origin main
```

1. 打开仓库 **Actions** → 左侧 **Build unsigned IPA** → 右侧 **Run workflow**
2. 约 5–8 分钟后，在该次运行页面底部 **Artifacts** 下载
   `TJSpace-unsigned-ipa.zip`，解压即得 `TJSpace-unsigned.ipa`
3. 也可以打 tag 自动触发：`git tag v0.1.0 && git push --tags`

工作流在 `macos-15` runner 上执行：`npm install` → `cap sync ios` → `xcodebuild archive`
（`CODE_SIGNING_ALLOWED=NO`）→ 打包 `Payload/App.app` → 上传 artifact。

---

## 方式二：本机 macOS

需要 Xcode（App Store 安装）与 Node 18+。

```bash
cd TJSpace
npm install
bash scripts/build-ios.sh      # 产物：./TJSpace-unsigned.ipa
```

脚本做的事：

1. 检查 `xcodebuild` 是否存在
2. `npx cap sync ios` —— 把 `app/` 拷进 `ios/App/App/public/`
3. `xcodebuild archive` —— Release / `-sdk iphoneos` / `ARCHS=arm64` / 关闭全部签名
4. 把 `Products/Applications/App.app` 塞进 `Payload/`，zip 成 IPA

手动分步等价于：

```bash
npx cap sync ios

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

> 依赖管理用的是 **Swift Package Manager**（Capacitor 8 默认），
> 工程里没有 `Podfile`，不需要 `pod install`。首次编译会自动从
> `github.com/ionic-team/capacitor-swift-pm` 拉包，需要联网。

---

## 装到 iPhone 上

未签名 IPA **不能直接安装**，iOS 只接受有签名的包，必须重签：

| 工具 | 平台 | 说明 |
| --- | --- | --- |
| **Sideloadly** | Win / macOS | 最省事，Apple ID 免费证书重签，7 天有效 |
| **AltStore** | Win / macOS | 自带 7 天自动续签 |
| **TrollStore** | 设备端 | 仅限特定 iOS 版本，装完永久有效 |
| **Xcode** | macOS | `Devices and Simulators` 直接拖入，需开发者账号 |

免费 Apple ID 签名的应用 7 天后失效，需重新签；付费开发者账号（$99/年）为 1 年。

---

## 原生层已做的适配

| 问题 | 处理 |
| --- | --- |
| 刘海 / 灵动岛遮挡 | `native.css` 用 `max(--status-h, env(safe-area-inset-top))` 让出真实安全区 |
| 底部浮动栏压到 Home Indicator | `--tabbar-total` 追加 `env(safe-area-inset-bottom)`，`bottom` 同步抬高 |
| 桌面预览的假状态栏在真机上重复 | `html.is-native .statusbar{display:none}`，真机由系统绘制 |
| 深色主题下系统状态栏文字看不见 | `@capacitor/status-bar` + `TJ.native.sync()` 随主题切换 `DARK/LIGHT` |
| WKWebView 里调 OpenAI / DeepSeek 被 CORS 拦 | `plugins.CapacitorHttp.enabled = true`，走原生 HTTP，无 CORS |
| 原生 HTTP 忽略 `AbortSignal` 导致请求悬挂 | `ai.js` 加 `Promise.race` 45s 超时兜底，失败回退本地排程 |
| 横屏把布局压坏 | `Info.plist` 锁定竖屏（iPhone / iPad 均只留 Portrait） |
| 整页橡皮筋回弹 | `overscroll-behavior` 收敛到列表内部 |

`app/js/native.js` 在浏览器里是空操作（`isNative === false`），
所以 `index.html` 双击预览的行为完全不变。

---

## 目录结构

```
TJSpace/
├── app/                          # 纯静态前端
│   ├── index.html
│   ├── icon-180.png / favicon.png
│   ├── css/{tokens,app,platform,native}.css
│   └── js/{util,native,holidays,store,todo,ai,me,app}.js
├── capacitor.config.json         # appId / appName / webDir=app / 插件开关
├── package.json
├── scripts/
│   ├── build-ios.sh              # macOS 一键构建 → TJSpace-unsigned.ipa
│   └── make-icons.py             # 生成 App 图标与启动图
├── .github/workflows/ios-unsigned.yml
├── ios/                          # Capacitor 生成的原生工程（含共享 scheme App）
│   └── App/
│       ├── App.xcodeproj
│       ├── App/                  # AppDelegate / Info.plist / Assets.xcassets / public
│       └── CapApp-SPM/           # Swift Package 清单
└── BUILD-IOS.md
```

## 改完前端之后

```bash
npx cap sync ios     # 重新把 app/ 拷进原生工程
```

改了 `appName` / `appId` 需要重新 `npx cap add ios`（先删 `ios/`）。
