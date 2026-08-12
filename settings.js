document.addEventListener("DOMContentLoaded", () => {
  const proxyScheme = document.getElementById("proxyScheme")
  const proxyHost = document.getElementById("proxyHost")
  const proxyPort = document.getElementById("proxyPort")
  const bypassList = document.getElementById("bypassList")
  const setProxyBtn = document.getElementById("setProxy")
  const clearProxyBtn = document.getElementById("clearProxy")
  const presetSelect = document.getElementById("presetSelect")

  fetch(chrome.runtime.getURL("bypass.json"))
    .then((response) => response.json())
    .then((data) => {
      Object.keys(data).forEach((key) => {
        data[key] = data[key].filter((rule) => isValidBypassRule(rule))
      })
      window.bypassPresets = data
      Object.keys(data).forEach((key) => {
        const option = document.createElement("option")
        option.value = key
        option.textContent = key
        presetSelect.appendChild(option)
      })
    })
    .catch((err) => console.error("读取绕过预设失败:", err))

  presetSelect.addEventListener("change", () => {
    const selected = presetSelect.value
    if (selected && window.bypassPresets && window.bypassPresets[selected]) {
      bypassList.value = window.bypassPresets[selected].join("\n")
    } else {
      bypassList.value = ""
    }
  })

  chrome.storage.local.get(
    ["proxyScheme", "proxyHost", "proxyPort", "bypassList"],
    (result) => {
      proxyScheme.value = result.proxyScheme || "http"
      proxyHost.value = result.proxyHost || ""
      proxyPort.value = result.proxyPort || ""
      bypassList.value = result.bypassList || "<local>"
    },
  )

  // 中文域名 -> Punycode。仅当含非 ASCII 字符时转换，其余规则原样穿过。
  function toPunycode(hostname) {
    if (!hostname || !/[^\x00-\x7F]/.test(hostname)) return hostname
    try {
      return new URL(`http://${hostname}`).hostname
    } catch {
      return hostname
    }
  }

  function isIPv4(s) {
    const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    return !!m && m.slice(1).every((seg) => Number(seg) >= 0 && Number(seg) <= 255)
  }

  function isIPv6(s) {
    if (!s || !s.includes(":") || /[^0-9a-fA-F:]/.test(s)) return false
    if (s.split("::").length - 1 > 1) return false // "::" 至多一次
    return s.split(":").every((p) => p === "" || /^[0-9a-fA-F]{1,4}$/.test(p))
  }

  // 域名主体（允许前导 . 表示 *.domain，禁止连续点）
  function isHostLabel(s) {
    return /^\.?[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(s) && !s.includes("..")
  }

  // 严格对照 Chromium bypassList 解析能力校验。
  // 只放行 Chrome 真正能识别的格式，避免"校验通过但设置后不生效"。
  function isValidBypassRule(rule) {
    if (!rule || !rule.trim()) return false
    rule = rule.trim()

    if (rule === "<local>" || rule === "<loopback>" || rule === "*") return true

    // CIDR: IP/PREFIX
    const cidrMatch = rule.match(/^(.+?)\/(\d+)$/)
    if (cidrMatch) {
      const ipPart = cidrMatch[1]
      const prefix = parseInt(cidrMatch[2], 10)
      if (isIPv4(ipPart) && prefix >= 0 && prefix <= 32) return true
      const v6 = ipPart.replace(/^\[|\]$/g, "")
      if (isIPv6(v6) && prefix >= 0 && prefix <= 128) return true
      return false
    }

    // 去掉可选 scheme 前缀
    let host = rule.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "")
    // 去掉可选端口（注意 IPv6 方括号）
    host = host.startsWith("[") ? host.replace(/\]:\d+$/, "]") : host.replace(/:\d+$/, "")

    const v6 = host.replace(/^\[|\]$/g, "")
    if (/^\[.*\]$/.test(host) && isIPv6(v6)) return true // [IPv6]
    if (isIPv4(host)) return true

    // 通配符：仅允许开头一个 *，后接 .domain 或 domain；中间/结尾不允许 *
    if (host.startsWith("*")) {
      const rest = host.slice(1)
      return rest === "" || (isHostLabel(rest) && !rest.includes("*"))
    }
    // 普通域名（精确匹配，不含子域；要含子域请用 *.domain）
    if (isHostLabel(host) && !host.includes("*")) return true
    return false
  }

  setProxyBtn.addEventListener("click", () => {
    const scheme = proxyScheme.value
    const host = toPunycode(proxyHost.value.trim())
    const port = proxyPort.value.trim()

    if (!host) {
      alert("请输入代理服务器地址")
      return
    }
    if (!port) {
      alert("请输入代理端口")
      return
    }

    const bypassRules = bypassList.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((rule) => toPunycode(rule))

    const invalidRules = bypassRules.filter((rule) => !isValidBypassRule(rule))
    if (invalidRules.length > 0) {
      alert(`以下规则格式无效：\n${invalidRules.join("\n")}\n\n请检查格式是否正确。`)
      return
    }

    chrome.runtime.sendMessage(
      { action: "setProxy", scheme, host, port, bypassList: bypassRules },
      (response) => {
        if (response && response.success) {
          chrome.storage.local.set(
            {
              proxyEnabled: true,
              proxyScheme: scheme,
              proxyHost: host,
              proxyPort: port,
              bypassList: bypassRules.join("\n"),
            },
            () => {
              alert("代理设置成功")
              window.close()
            },
          )
        } else {
          alert("代理设置失败: " + (response?.error || "未知错误"))
        }
      },
    )
  })

  clearProxyBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "clearProxy" }, (response) => {
      if (response && response.success) {
        chrome.storage.local.set({ proxyEnabled: false }, () => {
          proxyScheme.value = "http"
          proxyHost.value = ""
          proxyPort.value = ""
          chrome.storage.local.remove(["proxyScheme", "proxyHost", "proxyPort"])
          alert("代理已清除")
          window.close()
        })
      }
    })
  })
})
