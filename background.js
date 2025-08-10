chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ proxyEnabled: false });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(
    ['proxyEnabled', 'proxyScheme', 'proxyHost', 'proxyPort', 'bypassList'], 
    (result) => {
      if (result.proxyEnabled) {
        const bypassArray = result.bypassList ? 
          result.bypassList.split('\n').map(line => line.trim()).filter(line => line.length > 0) :
          ['localhost'];
        applyProxySettings(result.proxyScheme, result.proxyHost, result.proxyPort, bypassArray, null);
      }
    }
  );
});

function applyProxySettings(scheme, host, port, bypassList = ['localhost'], callback) {
  // 预处理绕过列表
  const processedBypassList = bypassList.map(rule => {
    // 如果是IP地址段，确保格式正确
    if (rule.includes('/')) {
      const [ip, mask] = rule.split('/');
      if (mask && !isNaN(mask) && mask <= 32) {
        return rule;
      }
      return ip;
    }
    // 处理IPv6地址
    if (rule.startsWith('[') && rule.endsWith(']')) {
      return rule;
    }
    // 确保通配符域名格式正确
    if (rule.startsWith('*.')) {
      return rule;
    }
    // 处理普通域名和IP地址
    return rule;
  });

  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: scheme,
        host: host,
        port: parseInt(port)
      },
      bypassList: processedBypassList
    }
  };

  chrome.proxy.settings.set({ 
    value: config, 
    scope: "regular" 
  }, () => {
    chrome.storage.local.set({ proxyEnabled: true }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        callback?.({ success: false, error: chrome.runtime.lastError.message });
      } else {
        callback?.({ success: true });
      }
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setProxy") {
    try {
      applyProxySettings(request.scheme, request.host, request.port, request.bypassList, sendResponse);
    } catch (error) {
      console.error(error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.action === "clearProxy") {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      chrome.storage.local.set({ proxyEnabled: false }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
    });
  } else if (request.action === "checkProxyStatus") {
    chrome.proxy.settings.get({}, (details) => {
      const isProxyActive = details.value.mode === "fixed_servers";
      sendResponse({ proxyActive: isProxyActive });
    });
  }
  return true;
});