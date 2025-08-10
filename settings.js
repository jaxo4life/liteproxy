document.addEventListener('DOMContentLoaded', () => {
  const proxyScheme = document.getElementById('proxyScheme');
  const proxyHost = document.getElementById('proxyHost');
  const proxyPort = document.getElementById('proxyPort');
  const bypassList = document.getElementById('bypassList');
  const setProxyBtn = document.getElementById('setProxy');
  const clearProxyBtn = document.getElementById('clearProxy');

  chrome.storage.local.get(['proxyScheme', 'proxyHost', 'proxyPort', 'bypassList'], (result) => {
    proxyScheme.value = result.proxyScheme || 'http';
    proxyHost.value = result.proxyHost || '';
    proxyPort.value = result.proxyPort || '';
    bypassList.value = result.bypassList || 'localhost';
  });

  function isValidBypassRule(rule) {
    // 空行
    if (!rule) return false;
    
    // IP地址 (IPv4或IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Regex = /^\[([0-9a-fA-F:]+)\]$/;
    
    // 域名
    const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    
    // 带通配符的域名
    const wildcardDomainRegex = /^\*\.[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    
    // URL
    const urlRegex = /^[a-zA-Z]+:\/\/[^\s/$.?#].[^\s]*$/;
    
    return rule === 'localhost' || 
           ipv4Regex.test(rule) || 
           ipv6Regex.test(rule) ||
           domainRegex.test(rule) ||
           wildcardDomainRegex.test(rule) ||
           urlRegex.test(rule);
  }

  setProxyBtn.addEventListener('click', () => {
    const scheme = proxyScheme.value;
    const host = proxyHost.value;
    const port = proxyPort.value;
    
    // 处理绕过列表
    const bypassRules = bypassList.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 验证规则
    const invalidRules = bypassRules.filter(rule => !isValidBypassRule(rule));
    if (invalidRules.length > 0) {
      alert(`以下规则格式无效：\n${invalidRules.join('\n')}\n\n请检查格式是否正确。`);
      return;
    }

    if (host && port) {
      chrome.runtime.sendMessage({ 
        action: "setProxy", 
        scheme, 
        host, 
        port,
        bypassList: bypassRules
      }, (response) => {
        if (response && response.success) {
          chrome.storage.local.set({ 
            proxyEnabled: true, 
            proxyScheme: scheme, 
            proxyHost: host, 
            proxyPort: port,
            bypassList: bypassList.value
          }, () => {
            alert('代理设置成功');
            window.close();
          });
        } else {
          alert('代理设置失败: ' + (response?.error || '未知错误'));
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