// 集中管理 badge 状态
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" })
  } else {
    chrome.action.setBadgeText({ text: "OFF" })
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" })
  }
}

function applyProxySettings(scheme, host, port, bypassList = ["<local>"], callback) {
  const processedBypassList = bypassList.map((rule) => {
    if (rule.includes("/")) {
      const [ip, mask] = rule.split("/")
      if (mask && !isNaN(mask) && mask <= 128) return rule
      return ip
    }
    if (rule.startsWith("[") && rule.endsWith("]")) return rule
    if (rule.startsWith("*.")) return rule
    return rule
  })

  if (!processedBypassList.includes("<local>")) {
    processedBypassList.push("<local>")
  }

  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: scheme,
        host: host,
        ...(port ? { port: parseInt(port, 10) } : {}),
      },
      bypassList: processedBypassList,
    },
  }

  chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
      callback?.({ success: false, error: chrome.runtime.lastError.message })
    } else {
      chrome.storage.local.set({ proxyEnabled: true }, () => {
        updateBadge(true)
        callback?.({ success: true })
      })
    }
  })
}

function extractHostname(urlString) {
  try {
    return new URL(urlString).hostname
  } catch {
    return null
  }
}

function initProxyState() {
  chrome.storage.local.get(
    ["proxyEnabled", "proxyScheme", "proxyHost", "proxyPort", "bypassList"],
    (result) => {
      if (result.proxyEnabled) {
        const bypassArray = result.bypassList
          ? result.bypassList
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
          : ["<local>"]
        applyProxySettings(
          result.proxyScheme,
          result.proxyHost,
          result.proxyPort,
          bypassArray,
        )
      }
      updateBadge(!!result.proxyEnabled)
    },
  )
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToBypass",
    title: "将此网站加入代理绕过列表",
    contexts: ["page", "frame", "link"],
  })
  initProxyState()
})

chrome.runtime.onStartup.addListener(() => {
  initProxyState()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setProxy") {
    try {
      applyProxySettings(
        request.scheme,
        request.host,
        request.port,
        request.bypassList,
        sendResponse,
      )
    } catch (error) {
      console.error(error)
      sendResponse({ success: false, error: error.message })
    }
  } else if (request.action === "clearProxy") {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      chrome.storage.local.set({ proxyEnabled: false }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          updateBadge(false)
          sendResponse({ success: true })
        }
      })
    })
  } else if (request.action === "checkProxyStatus") {
    chrome.proxy.settings.get({}, (details) => {
      sendResponse({ proxyActive: details.value.mode === "fixed_servers" })
    })
  } else if (request.action === "updateBadge") {
    updateBadge(request.enabled)
    sendResponse({ success: true })
  }
  return true
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToBypass") {
    // 优先使用 linkUrl（右键链接时），否则使用页面 URL
    const urlString = info.linkUrl || tab.url
    const hostname = extractHostname(urlString)
    if (!hostname) return

    chrome.storage.local.get(
      ["bypassList", "proxyEnabled", "proxyScheme", "proxyHost", "proxyPort"],
      (result) => {
        const currentBypassList = result.bypassList || "localhost\n127.0.0.1"
        const bypassArray = currentBypassList
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)

        if (
          bypassArray.includes(hostname) ||
          bypassArray.includes(`*.${hostname}`)
        ) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/logo.png",
            title: "代理绕过",
            message: `${hostname} 已在绕过列表中`,
          })
          return
        }

        bypassArray.push(hostname)
        const newBypassList = bypassArray.join("\n")

        chrome.storage.local.set({ bypassList: newBypassList }, () => {
          if (result.proxyEnabled) {
            applyProxySettings(
              result.proxyScheme,
              result.proxyHost,
              result.proxyPort,
              bypassArray,
            )
          }

          chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/logo.png",
            title: "代理绕过",
            message: `已将 ${hostname} 加入绕过列表`,
          })
        })
      },
    )
  }
})

// 监听代理错误（官方 API）
chrome.proxy.onProxyError.addListener((details) => {
  console.error("代理错误:", details.error)
  if (details.fatal) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/public/logo.png",
      title: "代理致命错误",
      message: details.error || "代理连接已中断",
    })
  }
})
