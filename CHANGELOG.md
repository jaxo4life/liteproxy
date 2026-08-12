# Changelog

## v2.3.0 — 小而美收口

### 新增
- 快捷键切换代理（用户在 `chrome://extensions/shortcuts` 自定义绑定，避免与系统软件冲突）
- 严格 bypassList 格式校验（通配符仅开头 `*`、IPv4 段 0–255、IPv6/CIDR 收紧）
- GitHub Pages landing、MIT License

### 修复
- 带协议前缀的绕过规则（如 `http://example.com`）被错误切分导致失效
- 中文域名无法加入绕过列表
- 代理状态误判：现在校验 host 一致性，不再把浏览器手动代理当成已生效

### 改进
- 重做 popup：顶部状态色条 + 指示灯 + 内嵌代理卡
- 最小权限：删除 `tabs` 权限与 `web_accessible_resources` 暴露
- 端口改为必填（避免留空导致循环报错）
- 品牌统一为 LiteProxy，图标补全 16/48/128
- 移除预设快捷键，改由用户自行绑定

**完整对比**：https://github.com/jaxo4life/liteproxy/compare/v2.0.0...v2.3.0
