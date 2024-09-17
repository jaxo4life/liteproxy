document.addEventListener('DOMContentLoaded', () => {
  const currentProxyDiv = document.getElementById('currentProxy');
  const settingsBtn = document.getElementById('settingsBtn');

  function updateCurrentProxyDisplay() {
    chrome.storage.local.get(['proxyEnabled', 'proxyScheme', 'proxyHost', 'proxyPort'], (result) => {
      if (result.proxyEnabled) {
        currentProxyDiv.innerHTML = `
          <strong>当前代理:</strong><br>
          模式: ${result.proxyScheme}<br>
          地址: ${result.proxyHost}<br>
          端口: ${result.proxyPort}
        `;
      } else {
        currentProxyDiv.innerHTML = '<strong>当前未使用代理</strong>';
      }
    });
  }

  updateCurrentProxyDisplay();

  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });
});