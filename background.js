chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ proxyEnabled: false });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setProxy") {
    let config;
    if (request.scheme === "http") {
      config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "http",
            host: request.host,
            port: parseInt(request.port)
          },
          bypassList: ["localhost"]
        }
      };
    } else if (request.scheme === "socks5") {
      config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "socks5",
            host: request.host,
            port: parseInt(request.port)
          },
          bypassList: ["localhost"]
        }
      };
    }

    chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
      chrome.storage.local.set({ proxyEnabled: true });
      sendResponse({ success: true });
    });
  } else if (request.action === "clearProxy") {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      chrome.storage.local.set({ proxyEnabled: false });
      sendResponse({ success: true });
    });
  }
  return true;
});