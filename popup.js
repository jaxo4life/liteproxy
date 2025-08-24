document.addEventListener("DOMContentLoaded", () => {
  const currentProxyDiv = document.getElementById("currentProxy");
  const settingsBtn = document.getElementById("settingsBtn");

  function formatBypassList(bypassList) {
    if (!bypassList) return "";

    const rules = bypassList
      .split("\n")
      .map((rule) => rule.trim())
      .filter((rule) => rule);

    if (rules.length === 0) return "";

    return (
      `<br><strong>绕过规则:</strong><br>` +
      rules
        .map((rule) => {
          let icon = "🌐"; // 默认图标
          if (rule.includes("*")) {
            icon = "⭐"; // 通配符规则
          } else if (rule.match(/^(\d{1,3}\.){3}\d{1,3}/)) {
            icon = "🔢"; // IPv4地址
          } else if (rule.startsWith("[")) {
            icon = "📍"; // IPv6地址
          }
          return `${icon} ${rule}`;
        })
        .join("<br>")
    );
  }

  function updateCurrentProxyDisplay() {
    chrome.storage.local.get(
      ["proxyEnabled", "proxyScheme", "proxyHost", "proxyPort", "bypassList"],
      (result) => {
        if (result.proxyEnabled) {
          chrome.runtime.sendMessage(
            { action: "checkProxyStatus" },
            (response) => {
              if (response.proxyActive) {
                currentProxyDiv.innerHTML = `
                <strong>当前代理:</strong><br>
                模式: ${result.proxyScheme}<br>
                地址: ${result.proxyHost}<br>
                端口: ${result.proxyPort}
                ${formatBypassList(result.bypassList)}
              `;
              } else {
                currentProxyDiv.innerHTML =
                  '<strong style="color: red;">警告：代理设置未生效，请重新设置</strong>';
              }
            }
          );
        } else {
          currentProxyDiv.innerHTML = "<strong>当前未使用代理</strong>";
        }
      }
    );
  }

  updateCurrentProxyDisplay();

  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "settings.html" });
  });
});
