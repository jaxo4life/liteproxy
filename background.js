// LiteProxy background service worker

// 集中管理 badge 状态
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" })
  } else {
    chrome.action.setBadgeText({ text: "OFF" })
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" })
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "/public/icons/icon128.png",
    title,
    message,
  })
}

// 统一解析绕过列表（兼容数组与换行字符串）
function parseBypassList(stored) {
  if (!stored) return ["<local>"]
  if (Array.isArray(stored)) return stored
  return stored
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function applyProxySettings(scheme, host, port, bypassList = ["<local>"], callback) {
  // bypass 规则原样交给 Chrome 权威解析（settings.js 已做格式校验）。
  // 这里只保证 <local> 存在，不再二次预处理——
  // 旧版 split("/") 会把 "http://example.com" 错切成 "http:" 导致规则失效。
  const rules = bypassList.slice()
  if (!rules.includes("<local>")) rules.push("<local>")

  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: scheme,
        host: host,
        ...(port ? { port: parseInt(port, 10) } : {}),
      },
      bypassList: rules,
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
        applyProxySettings(
          result.proxyScheme,
          result.proxyHost,
          result.proxyPort,
          parseBypassList(result.bypassList),
        )
      }
      updateBadge(!!result.proxyEnabled)
    },
  )
}

// 快捷键 / 通用开关：无 UI 时通过通知反馈
function toggleProxy() {
  chrome.storage.local.get(
    ["proxyEnabled", "proxyScheme", "proxyHost", "proxyPort", "bypassList"],
    (result) => {
      if (result.proxyEnabled) {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
          chrome.storage.local.set({ proxyEnabled: false }, () => {
            updateBadge(false)
            notify("LiteProxy", "已禁用代理")
          })
        })
      } else {
        applyProxySettings(
          result.proxyScheme,
          result.proxyHost,
          result.proxyPort,
          parseBypassList(result.bypassList),
        )
        notify("LiteProxy", "已启用代理")
      }
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

chrome.runtime.onStartup.addListener(initProxyState)

// 快捷键切换代理。不预设按键，由用户在 chrome://extensions/shortcuts 自定义绑定，避免与系统软件冲突。
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-extension") toggleProxy()
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
    // 既校验模式，也校验 host 是否为本扩展设置的代理
    chrome.storage.local.get(["proxyHost"], (stored) => {
      chrome.proxy.settings.get({}, (details) => {
        const single = details.value && details.value.rules && details.value.rules.singleProxy
        const active =
          details.value.mode === "fixed_servers" &&
          !!single &&
          single.host === stored.proxyHost
        sendResponse({ proxyActive: active })
      })
    })
  } else if (request.action === "updateBadge") {
    updateBadge(request.enabled)
    sendResponse({ success: true })
  } else {
    sendResponse({ success: false, error: "unknown action" })
  }
  return true
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "addToBypass") return

  // page context 提供 pageUrl，link context 提供 linkUrl，均无需 tabs 权限
  const urlString = info.linkUrl || info.pageUrl
  const hostname = extractHostname(urlString)
  if (!hostname) return

  chrome.storage.local.get(
    ["bypassList", "proxyEnabled", "proxyScheme", "proxyHost", "proxyPort"],
    (result) => {
      const bypassArray = parseBypassList(result.bypassList)

      if (bypassArray.includes(hostname) || bypassArray.includes(`*.${hostname}`)) {
        notify("代理绕过", `${hostname} 已在绕过列表中`)
        return
      }

      bypassArray.push(hostname)

      chrome.storage.local.set({ bypassList: bypassArray.join("\n") }, () => {
        if (result.proxyEnabled) {
          applyProxySettings(
            result.proxyScheme,
            result.proxyHost,
            result.proxyPort,
            bypassArray,
          )
        }
        notify("代理绕过", `已将 ${hostname} 加入绕过列表`)
      })
    },
  )
})

// 监听代理错误（官方 API）
chrome.proxy.onProxyError.addListener((details) => {
  console.error("代理错误:", details.error)
  if (details.fatal) {
    notify("代理致命错误", details.error || "代理连接已中断")
  }
})
