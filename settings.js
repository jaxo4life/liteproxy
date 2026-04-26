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
        const filteredRules = data[key].filter((rule) =>
          isValidBypassRule(rule),
        )
        data[key] = filteredRules
      })

      window.bypassPresets = data

      Object.keys(data).forEach((key) => {
        const option = document.createElement("option")
        option.value = key
        option.textContent = key
        presetSelect.appendChild(option)
      })
    })
    .catch((err) => {
      console.error("读取绕过预设失败:", err)
    })

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

  // 完整覆盖官方文档定义的 bypassList 格式
  function isValidBypassRule(rule) {
    if (!rule || !rule.trim()) return false
    rule = rule.trim()

    // <local> 特殊字面量
    if (rule === "<local>") return true

    // CIDR: IP_LITERAL/PREFIX_LENGTH_IN_BITS（IPv4 和 IPv6）
    const cidrMatch = rule.match(/^(.+)\/(\d+)$/)
    if (cidrMatch) {
      const ipPart = cidrMatch[1]
      const prefix = parseInt(cidrMatch[2], 10)
      // IPv4 CIDR
      if (
        /^(\d{1,3}\.){3}\d{1,3}$/.test(ipPart) &&
        prefix >= 0 &&
        prefix <= 32
      )
        return true
      // IPv6 CIDR（方括号或裸格式）
      if (/^\[?[0-9a-fA-F:]+\]?$/.test(ipPart) && prefix >= 0 && prefix <= 128)
        return true
      return false
    }

    // 去掉可选的 scheme 前缀
    let host = rule.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "")

    // 去掉可选的端口（注意 IPv6 方括号）
    if (host.startsWith("[")) {
      host = host.replace(/\]:\d+$/, "]")
    } else {
      host = host.replace(/:\d+$/, "")
    }

    // IPv6 字面量
    if (/^\[[0-9a-fA-F:]+\]$/.test(host)) return true

    // IPv4 字面量
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true

    // 通配符域名：*.example.com 或 *example.com（无点通配）
    if (/^\*\.?[a-zA-Z0-9]([a-zA-Z0-9.*-]*[a-zA-Z0-9])?$/.test(host))
      return true

    // 普通域名（允许前导 . 表示 *.）
    if (/^\.?[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host))
      return true

    return false
  }

  // Punycode 转换：中文域名 -> ASCII
  function toPunycode(hostname) {
    try {
      return new URL(`http://${hostname}`).hostname
    } catch {
      return hostname
    }
  }

  setProxyBtn.addEventListener("click", () => {
    const scheme = proxyScheme.value
    const rawHost = proxyHost.value.trim()
    const port = proxyPort.value.trim()

    // Punycode 转换
    const host = toPunycode(rawHost)

    const bypassRules = bypassList.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const invalidRules = bypassRules.filter((rule) => !isValidBypassRule(rule))
    if (invalidRules.length > 0) {
      alert(
        `以下规则格式无效：\n${invalidRules.join("\n")}\n\n请检查格式是否正确。`,
      )
      return
    }

    if (host) {
      chrome.runtime.sendMessage(
        {
          action: "setProxy",
          scheme,
          host,
          port,
          bypassList: bypassRules,
        },
        (response) => {
          if (response && response.success) {
            chrome.storage.local.set(
              {
                proxyEnabled: true,
                proxyScheme: scheme,
                proxyHost: host,
                proxyPort: port,
                bypassList: bypassList.value,
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
    } else {
      alert("请输入代理服务器地址")
    }
  })

  clearProxyBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "clearProxy" }, (response) => {
      if (response.success) {
        chrome.storage.local.set({ proxyEnabled: false }, () => {
          proxyScheme.value = "http"
          proxyHost.value = ""
          proxyPort.value = ""
          chrome.storage.local.remove([
            "proxyScheme",
            "proxyHost",
            "proxyPort",
          ])
          alert("代理已清除")
          window.close()
        })
      }
    })
  })
})
