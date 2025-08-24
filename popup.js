document.addEventListener("DOMContentLoaded", () => {
  const currentProxyDiv = document.getElementById("currentProxy");
  const settingsBtn = document.getElementById("settingsBtn");

  const manifest = chrome.runtime.getManifest();
  const versionElement = document.querySelector("#version");
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`;
  }

  const toggleButton = document.getElementById("toggleButton");

  document
    .getElementById("toggleButton")
    .addEventListener("click", toggleExtension);

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
          chrome.action.setBadgeText({
            text: "",
          });
          toggleButton.textContent = "禁用扩展";
          toggleButton.classList.remove("disabled");          
        } else {
          chrome.action.setBadgeText({
            text: "OFF",
          });
          chrome.action.setBadgeBackgroundColor({
            color: "#ef4444",
          });
          toggleButton.textContent = "启用扩展";
          toggleButton.classList.add("disabled");
          currentProxyDiv.innerHTML = "<strong>当前未使用代理</strong>";
        }
      }
    );
  }

  function toggleExtension() {
    chrome.storage.local.get(["proxyEnabled"], (items) => {
      const newState = !items.proxyEnabled;
      chrome.storage.local.set({ proxyEnabled: newState }, () => {
        updateCurrentProxyDisplay();
      });
    });
  }

  updateCurrentProxyDisplay();

  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "settings.html" });
  });
});
