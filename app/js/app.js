/* ============================================================
   TJSpace · 应用入口 / 路由
   ============================================================ */
(function (TJ) {
  'use strict';

  const D = TJ.dom, S = TJ.store;
  const $$ = D.$$;
  let current = 'todo';

  function go(tab) {
    if (tab === current) {
      // 重复点击当前页：回到顶部
      const sc = document.querySelector('.view.is-active .view-scroll');
      if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    current = tab;

    $$('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.dataset.view === tab);
    });
    $$('.tab').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.tab === tab);
    });

    // 浮动加号只在 To-do / AI 出现
    const fab = document.getElementById('fab');
    fab.style.opacity = (tab === 'hw' || tab === 'me') ? '0' : '1';
    fab.style.pointerEvents = (tab === 'hw' || tab === 'me') ? 'none' : 'auto';
    fab.style.transform = (tab === 'hw' || tab === 'me') ? 'scale(.6)' : '';

    if (tab === 'todo') TJ.todo.render();
    if (tab === 'ai') TJ.ai.onEnter();
    if (tab === 'me') TJ.me.render();
    TJ.util.haptic();
  }

  function init() {
    // 主题先行，避免闪烁
    S.applyTheme();

    TJ.todo.init();
    TJ.ai.init();
    TJ.me.init();

    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.tab); });
    });

    // 初始渲染
    TJ.todo.render();

    // 支持用 #ai / #hw / #me 直接进入某个页签（便于分享与调试）
    const hash = (location.hash || '').replace('#', '');
    if (['todo', 'ai', 'hw', 'me'].indexOf(hash) >= 0) go(hash);

    // 每小时刷新一次「今」的状态
    setInterval(function () {
      if (current === 'todo') TJ.todo.render();
    }, 60 * 1000 * 5);

    // 页面隐藏前落盘
    window.addEventListener('pagehide', S.flush);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) S.flush();
    });
  }

  TJ.app = {
    init, go,
    current: () => current,
    refreshAiHint() {
      TJ.ai.resetPlanFlag();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})(window.TJ);
