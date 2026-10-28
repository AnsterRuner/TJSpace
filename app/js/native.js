/* ============================================================
   TJSpace · 原生壳桥接（Capacitor iOS / Android）
   浏览器中 TJ.native.isNative 恒为 false，所有调用都是空操作。
   ============================================================ */
(function (TJ) {
  'use strict';

  let isNative = false;
  try {
    const C = window.Capacitor;
    isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  } catch (e) { /* ignore */ }
  if (!isNative && /^(capacitor|ionic):/.test(location.protocol)) isNative = true;

  function plugin(name) {
    const C = window.Capacitor;
    return (C && C.Plugins && C.Plugins[name]) || null;
  }

  /** 让系统状态栏文字颜色跟随主题：深色主题用浅色文字 */
  function syncStatusBar() {
    if (!isNative) return;
    const P = plugin('StatusBar');
    if (!P) return;
    const dark = document.documentElement.classList.contains('is-dark');
    try {
      P.setStyle({ style: dark ? 'DARK' : 'LIGHT' });
      P.setOverlaysWebView({ overlay: true });
    } catch (e) { /* 插件缺失时静默 */ }
  }

  function init() {
    if (!isNative) return;
    document.documentElement.classList.add('is-native');
    syncStatusBar();
    // 桥接注入有先后，稍后再同步一次
    setTimeout(syncStatusBar, 400);
  }

  TJ.native = {
    get isNative() { return isNative; },
    sync: syncStatusBar,
    init: init
  };

  init();
})(window.TJ);
