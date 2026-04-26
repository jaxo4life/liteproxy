<p align="center">
  <img src="/public/logo.png" alt="LiteProxy Logo" width="128">
</p>

<h1 align="center">LiteProxy</h1>

<p align="center">
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest"></a>
  <a href="#"><img src="https://img.shields.io/badge/Proxy-HTTP%20%7C%20HTTPS%20%7C%20SOCKS4%20%7C%20SOCKS5%20%7C%20QUIC-orange.svg" alt="Proxy Support"></a>
  <a href="#"><img src="https://img.shields.io/badge/China%20Direct%20Rules-Built--in-red.svg" alt="China Direct Rules"></a>
</p>

## LiteProxy — 简洁高效的 Chrome 代理扩展

**LiteProxy** 是一款轻量、易用的 Chrome 浏览器代理扩展，基于 **Manifest V3** 规范开发。
无需复杂设置，几步即可完成代理切换，让你的浏览体验更加自由顺畅。

---

### 功能特点

- **轻量无依赖** — 仅需加载扩展，无需安装额外软件
- **全协议支持** — 兼容 HTTP、HTTPS、SOCKS4、SOCKS5、QUIC 五种代理协议
- **即时切换** — 一键启用/禁用代理，立即生效
- **右键快速绕过** — 在任意网页上右键即可将当前网站加入代理绕过列表
- **内置中国大陆直连规则** — 常见国内网站和 IP 段自动直连，海外流量走代理
- **代理错误提醒** — 代理连接异常时自动弹出通知
- **端口自动推断** — 未指定端口时自动使用协议默认端口（HTTP=80, HTTPS=443, SOCKS=1080）
- **中文域名支持** — 自动将中文域名转换为 Punycode 格式

---

### 安装方法

1. **下载项目文件**
   将本仓库代码下载并解压至本地

2. **打开 Chrome 扩展管理**
   地址栏输入 `chrome://extensions/`

3. **启用开发者模式**
   右上角开启 **开发者模式**

4. **加载扩展**
   点击 **"加载已解压的扩展程序"**，选择解压后的文件夹

5. **开始使用**
   点击扩展图标，配置代理地址和端口，选择协议，即可启用代理

---

### 使用说明

- **设置代理**：点击扩展图标进入设置页，填写代理服务器地址、端口、选择协议
- **绕过列表**：支持域名、通配符（`*.example.com`）、IP 地址、CIDR 网段（`192.168.0.0/16`）、`<local>` 等格式
- **预设规则**：内置"中国大陆直连"预设，一键加载常见国内网站和 IP 段的绕过规则
- **右键添加**：在网页或链接上右键选择"将此网站加入代理绕过列表"，快速绕过指定域名
- **快捷键**：支持通过 Chrome 快捷键设置切换代理开关

---

### 界面预览

![界面预览](screenshot.png)
