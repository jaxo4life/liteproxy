document.addEventListener("DOMContentLoaded", () => {
  const currentProxyDiv = document.getElementById("currentProxy")
  const settingsBtn = document.getElementById("settingsBtn")

  const manifest = chrome.runtime.getManifest()
  const versionElement = document.querySelector("#version")
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`
  }

  const toggleButton = document.getElementById("toggleButton")

  document
    .getElementById("toggleButton")
    .addEventListener("click", toggleExtension)

  function formatBypassList(bypassList) {
    if (!bypassList) return ""

    const rules = bypassList
      .split("\n")
      .map((rule) => rule.trim())
      .filter((rule) => rule)

    if (rules.length === 0) return ""

    return (
      `<br><strong>绕过规则:</strong><br>` +
      rules
        .map((rule) => {
          let icon = "..."
          if (rule === "<local>") {
            icon = "[L]"
          } else if (rule.includes("*")) {
            icon = "[*]"
          } else if (rule.match(/^(\d{1,3}\.){3}\d{1,3}/)) {
            icon = "[#]"
          } else if (rule.startsWith("[")) {
            icon = "[v]"
          }
          return `${icon} ${rule}`
        })
        .join("<br>")
    )
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
                ${result.proxyPort ? "端口: " + result.proxyPort + "<br>" : ""}
                ${formatBypassList(result.bypassList)}
              `
              } else {
                currentProxyDiv.innerHTML =
                  '<strong style="color: red;">警告：代理设置未生效，请重新设置</strong>'
              }
            },
          )
          toggleButton.textContent = "禁用扩展"
          toggleButton.classList.remove("disabled")
        } else {
          toggleButton.textContent = "启用扩展"
          toggleButton.classList.add("disabled")
          currentProxyDiv.innerHTML = "<strong>当前未使用代理</strong>"
        }
      },
    )
  }

  function toggleExtension() {
    chrome.storage.local.get(["proxyEnabled"], (items) => {
      const newState = !items.proxyEnabled

      if (newState) {
        chrome.storage.local.get(
          ["proxyScheme", "proxyHost", "proxyPort", "bypassList"],
          (config) => {
            chrome.runtime.sendMessage(
              {
                action: "setProxy",
                scheme: config.proxyScheme,
                host: config.proxyHost,
                port: config.proxyPort,
                bypassList: config.bypassList
                  ? config.bypassList.split("\n").map((x) => x.trim())
                  : ["<local>"],
              },
              () => updateCurrentProxyDisplay(),
            )
          },
        )
      } else {
        chrome.runtime.sendMessage({ action: "clearProxy" }, () => {
          updateCurrentProxyDisplay()
        })
      }
    })
  }

  updateCurrentProxyDisplay()

  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "settings.html" })
  })
})
