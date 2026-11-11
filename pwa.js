(() => {
  'use strict';
  const status = document.getElementById('offlineStatus');
  const installButton = document.getElementById('installButton');
  const dialog = document.getElementById('installDialog');
  let installPrompt = null, offlineReady = false, shareTimer;
  function refreshStatus() { status.textContent = offlineReady ? navigator.onLine ? '✓ 已可离线游玩' : '✓ 离线游玩中' : navigator.onLine ? '点开就能玩' : '当前离线，请联网加载素材'; }
  function pauseGame() { document.dispatchEvent(new CustomEvent('fish:pause')); }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installButton.textContent = '安装到桌面'; });
  installButton.addEventListener('click', async () => {
    pauseGame();
    if (installPrompt) { const prompt = installPrompt; installPrompt = null; await prompt.prompt(); await prompt.userChoice; }
    else dialog.showModal();
  });
  document.getElementById('closeInstall').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  window.addEventListener('appinstalled', () => { installButton.textContent = '已添加到桌面'; });
  document.getElementById('shareButton').addEventListener('click', async () => {
    pauseGame();
    const url = new URL('./', location.href).href;
    try {
      if (navigator.share) await navigator.share({ title: '捕捉鱼头', text: '绿色鱼头集体出逃！点开一起放钩，挑战八关鱼头冒险。', url });
      else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); status.textContent = '链接已复制，发给朋友吧'; clearTimeout(shareTimer); shareTimer = setTimeout(refreshStatus, 3500); }
      else window.prompt('复制这个链接，发给朋友一起玩：', url);
    } catch (error) { if (error.name !== 'AbortError') { status.textContent = '可复制浏览器地址分享'; clearTimeout(shareTimer); shareTimer = setTimeout(refreshStatus, 3500); } }
  });
  async function setupOffline() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      const registration = await navigator.serviceWorker.ready;
      const channel = new MessageChannel();
      channel.port1.onmessage = event => { if (event.data?.type === 'OFFLINE_READY') { offlineReady = true; refreshStatus(); } channel.port1.close(); };
      registration.active.postMessage({ type: 'CHECK_OFFLINE' }, [channel.port2]);
    } catch (_) { status.textContent = '在线可玩 · 离线缓存暂不可用'; }
  }
  window.addEventListener('online', refreshStatus); window.addEventListener('offline', refreshStatus);
  window.addEventListener('load', setupOffline, { once: true });
})();

