# LiteProxy — 项目约定

Chrome MV3 全局代理扩展。原生 JS，无构建步骤，无依赖。

## 品牌与版本
- 品牌：**LiteProxy**（manifest.name、README、landing、commit message 统一用此名）。
- 版本号唯一来源：`manifest.json` 的 `version`，发版时同步打 git tag `vX.Y.Z`。
- 主清单 = manifest.json。

## 设计语言（popup / settings / landing 共用）
- 浅色基底 + 单一靛蓝强调色 `#4f46e5`（hover `#4338ca`，soft `rgba(79,70,229,.08)`）。
- 文字：主 `#18181b` / 次 `#71717a` / 弱 `#a1a1aa`；边框 `#e4e4e7`。
- 字体栈：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif`。
- 圆角 10–16px，微妙双层阴影，**不用渐变按钮**（渐变=廉价感）。
- CSS 变量在每个页面文件各自定义（各页面独立加载，不共享 css 文件）。
- 注：用户认为初版浅色 popup"太丑"，后续 popup 视觉方向需用户拍板（深色/浅色精致/跟随系统）。

## 架构约定
- service worker + `chrome.proxy.settings`（`scope: "regular"`）。代理状态由 Chrome 持久层托管，worker 休眠不影响生效；`onStartup`/`onInstalled` 重应用配置。
- **端口必填**（用户曾因留空触发循环报错）。不要恢复"自动推断默认端口"——那会让 README/placeholder 撒谎。
- bypassList 规则**原样交给 Chrome 权威解析**，background **不做二次预处理**：旧版 `split("/")` 会把带 scheme 前缀的规则 `http://example.com` 错切成 `http:` 导致失效。settings.js 负责格式校验（拦截 Chrome 不支持的通配如 `a*.com`、越界 IPv4 段 `999.x`）。
- 绕过语义（务必在文案里讲清）：`chrome.proxy.settings`(regular) 让 Chrome **忽略系统代理**；bypassList 中的地址 = **直连 DIRECT**，既不走本扩展代理也不走系统代理。`example.com` 只精确匹配自身，不含子域，要含子域用 `*.example.com`。
- `checkProxyStatus` 既校验 `mode` 也校验 `host`，避免误判浏览器手动代理为本扩展生效。

## 权限红线（最小权限）
- **不要**申请 `tabs`：右键绕过用 `info.linkUrl || info.pageUrl`（contextMenus 已提供，无需 tabs）。
- **不要**用 `web_accessible_resources` 暴露 `bypass.json`/`settings.html`：扩展页面 `fetch(chrome.runtime.getURL(...))` 访问自身打包资源**不需要** WAR，WAR 只在普通网页/内容脚本访问扩展资源时才需要。
- 快捷键命令**不预设 `suggested_key`**：任何预设键都可能与系统软件冲突；让用户在 `chrome://extensions/shortcuts` 自行绑定。
- 当前权限仅：`proxy`、`storage`、`contextMenus`、`notifications`。无任何 host/网络权限。

## GitHub Pages
- landing 在 `docs/index.html`（单文件，内联 CSS，引用 `./logo.png`）。仓库 Settings → Pages → Source 选 `main` / `/docs`。
- 预期地址：`https://jaxo4life.github.io/liteproxy/`。
- `docs/.nojekyll` 已建（纯静态，跳过 Jekyll 处理）。

## 图标
- 源图 `public/logo.png`（450×450）。三档 `public/icons/icon{16,48,128}.png` 由 PIL 从源图 LANCZOS 缩放生成。改 logo 后需重新生成三档。

## 截图
- `screenshot.png` 是 popup+settings 截图，由**用户在浏览器**重新截取（agent 无法在无浏览器环境生成）。UI 改动后需提醒用户重截。
