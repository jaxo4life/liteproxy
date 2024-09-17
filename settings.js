document.addEventListener('DOMContentLoaded', () => {
  const proxyScheme = document.getElementById('proxyScheme');
  const proxyHost = document.getElementById('proxyHost');
  const proxyPort = document.getElementById('proxyPort');
  const setProxyBtn = document.getElementById('setProxy');
  const clearProxyBtn = document.getElementById('clearProxy');

  chrome.storage.local.get(['proxyScheme', 'proxyHost', 'proxyPort'], (result) => {
    proxyScheme.value = result.proxyScheme || 'http';
    proxyHost.value = result.proxyHost || '';
    proxyPort.value = result.proxyPort || '';
  });

  setProxyBtn.addEventListener('click', () => {
    const scheme = proxyScheme.value;
    const host = proxyHost.value;
    const port = proxyPort.value;
    if (host && port) {
      chrome.runtime.sendMessage({ action: "setProxy", scheme, host, port }, (response) => {
        if (response.success) {
          chrome.storage.local.set({ proxyEnabled: true, proxyScheme: scheme, proxyHost: host, proxyPort: port }, () => {
            alert('代理设置成功');
            window.close();
          });
        }
      });
    } else {
      alert('请输入代理服务器地址和端口');
    }
  });

  clearProxyBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "clearProxy" }, (response) => {
      if (response.success) {
        chrome.storage.local.set({ proxyEnabled: false }, () => {
          proxyScheme.value = 'http';
          proxyHost.value = '';
          proxyPort.value = '';
          chrome.storage.local.remove(['proxyScheme', 'proxyHost', 'proxyPort']);
          alert('代理已清除');
          window.close();
        });
      }
    });
  });
});