document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleButton")
  const settingsBtn = document.getElementById("settingsBtn")
  const versionEl = document.getElementById("version")
  const statusBar = document.getElementById("statusBar")
  const stateLine = document.getElementById("stateLine")
  const stateText = document.getElementById("stateText")
  const proxyCard = document.getElementById("proxyCard")

  versionEl.textContent = `v${chrome.runtime.getManifest().version}`
  toggleBtn.addEventListener("click", toggleExtension)
  settingsBtn.addEventListener("click", () => chrome.tabs.create({ url: "settings.html" }))

  function renderProxy(info) {
    proxyCard.replaceChildren()
    const rows = [
      ["协议", info.scheme.toUpperCase()],
      ["地址", info.host],
      ["端口", info.port || "—"],
    ]
    for (const [k, v] of rows) {
      const row = document.createElement("div")
      row.className = "proxy-row"
      const kEl = document.createElement("span")
      kEl.className = "proxy-k"
      kEl.textContent = k
      const vEl = document.createElement("span")
      vEl.className = "proxy-v"
      vEl.textContent = v
      row.append(kEl, vEl)
      proxyCard.append(row)
    }
    if (info.bypass && info.bypass.length) {
      const b = document.createElement("div")
      b.className = "proxy-bypass"
      b.textContent = `绕过 ${info.bypass.length} 条规则`
      proxyCard.append(b)
    }
  }

  function setOn(info) {
    statusBar.classList.add("on")
    stateLine.classList.add("on")
    stateText.textContent = "已启用 · 代理生效中"
    toggleBtn.textContent = "禁用代理"
    toggleBtn.classList.add("on")
    proxyCard.classList.remove("empty")
    renderProxy(info)
  }

  function setWarning() {
    statusBar.classList.remove("on")
    stateLine.classList.remove("on")
    stateText.textContent = "代理设置未生效，请重新设置"
    toggleBtn.textContent = "禁用代理"
    toggleBtn.classList.add("on")
    proxyCard.classList.add("empty")
    proxyCard.replaceChildren()
  }

  function setOff() {
    statusBar.classList.remove("on")
    stateLine.classList.remove("on")
    stateText.textContent = "未启用代理"
    toggleBtn.textContent = "启用代理"
    toggleBtn.classList.remove("on")
    proxyCard.classList.add("empty")
    proxyCard.replaceChildren()
  }

  function refresh() {
    chrome.storage.local.get(
      ["proxyEnabled", "proxyScheme", "proxyHost", "proxyPort", "bypassList"],
      (result) => {
        if (result.proxyEnabled) {
          chrome.runtime.sendMessage({ action: "checkProxyStatus" }, (response) => {
            if (response && response.proxyActive) {
              const bypass = (result.bypassList || "")
                .split("\n").map((s) => s.trim()).filter(Boolean)
              setOn({
                scheme: result.proxyScheme,
                host: result.proxyHost,
                port: result.proxyPort,
                bypass,
              })
            } else {
              setWarning()
            }
          })
        } else {
          setOff()
        }
      },
    )
  }

  function toggleExtension() {
    chrome.storage.local.get(["proxyEnabled"], (items) => {
      if (items.proxyEnabled) {
        chrome.runtime.sendMessage({ action: "clearProxy" }, refresh)
      } else {
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
                  ? config.bypassList.split("\n").map((x) => x.trim()).filter(Boolean)
                  : ["<local>"],
              },
              refresh,
            )
          },
        )
      }
    })
  }

  refresh()
})
