/* ============================================================
   TJSpace · 基础工具 / 日期 / UI 原语
   ============================================================ */
window.TJ = window.TJ || {};

(function (TJ) {
  'use strict';

  /* ---------------- DOM ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (p) {
            if (p.indexOf('--') === 0) node.style.setProperty(p, v[p]);
            else node.style[p] = v[p];
          });
        }
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  let _uid = 0;
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + '_' + (++_uid);

  /* ---------------- 日期 ---------------- */
  const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const DOW_CN = ['日', '一', '二', '三', '四', '五', '六'];

  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  /** Date -> 'YYYY-MM-DD'（本地时区） */
  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  /** 'YYYY-MM-DD' -> Date（本地 00:00） */
  function parseKey(k) {
    const p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addDays(d, n) {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isSameDay(a, b) { return dateKey(a) === dateKey(b); }

  /** 本周起始日（weekStart: 1=周一, 0=周日） */
  function startOfWeek(d, weekStart) {
    const x = startOfDay(d);
    const diff = (x.getDay() - weekStart + 7) % 7;
    return addDays(x, -diff);
  }

  /** 当月第几周 */
  function weekOfMonth(d, weekStart) {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (first.getDay() - weekStart + 7) % 7;
    return Math.floor((d.getDate() - 1 + offset) / 7) + 1;
  }

  /** 'HH:mm' -> 分钟 */
  function toMin(hm) {
    if (!hm) return null;
    const p = String(hm).split(':');
    return (+p[0]) * 60 + (+(p[1] || 0));
  }
  function fromMin(m) {
    m = Math.max(0, Math.min(1439, Math.round(m)));
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }
  /** '08:00' -> '8:00' */
  function shortTime(hm) {
    if (!hm) return '';
    const p = String(hm).split(':');
    return (+p[0]) + ':' + pad2(+(p[1] || 0));
  }
  function durationText(a, b) {
    const d = toMin(b) - toMin(a);
    if (!isFinite(d) || d <= 0) return '';
    if (d < 60) return d + ' 分钟';
    const h = Math.floor(d / 60), m = d % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-show'), ms || 1900);
  }

  /* ---------------- 图标 ---------------- */
  const ICONS = {
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
    pencilFill: '<svg viewBox="0 0 24 24"><path d="M3 21l1.2-4.2L16.4 4.6a2.5 2.5 0 0 1 3.5 0l.5.5a2.5 2.5 0 0 1 0 3.5L8.2 20.8 4 22l-1-1Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7m-7 0 .9 12.1A1.4 1.4 0 0 0 9.8 20.5h4.4a1.4 1.4 0 0 0 1.4-1.4L16.5 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.6" y="5.2" width="16.8" height="15.2" rx="3.4"/><path d="M8 3.2v3.4M16 3.2v3.4M3.6 10h16.8"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s6.4-6.1 6.4-11A6.4 6.4 0 0 0 5.6 10c0 4.9 6.4 11 6.4 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6.4 10.2a5.6 5.6 0 0 1 11.2 0c0 4.1 1.6 5.6 1.6 5.6H4.8s1.6-1.5 1.6-5.6Z"/><path d="M10.2 19.2a2 2 0 0 0 3.6 0"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 3.4a8.6 8.6 0 0 0 0 17.2c1.3 0 1.9-.8 1.9-1.7 0-1.6-1.5-1.7-1.5-3 0-1 .8-1.8 1.9-1.8h1.6a4.7 4.7 0 0 0 4.7-4.7c0-3.4-3.7-6-8.6-6Z"/><circle cx="8.2" cy="9.2" r="1.1"/><circle cx="12" cy="7.4" r="1.1"/><circle cx="15.8" cy="9.2" r="1.1"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3.4l1.7 4.9 4.9 1.7-4.9 1.7L12 16.6l-1.7-4.9L5.4 10l4.9-1.7L12 3.4Z"/><path d="M18.2 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 7.8l2 1.2M17.5 15l2 1.2M4.5 16.2l2-1.2M17.5 9l2-1.2"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 8.1v.1"/></svg>',
    week: '<svg viewBox="0 0 24 24"><rect x="3.6" y="5.2" width="16.8" height="15.2" rx="3.4"/><path d="M3.6 10h16.8M7.6 3.2v3.4M12 3.2v3.4M16.4 3.2v3.4"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4.4 5.2A1.6 1.6 0 0 1 6 3.6h4.2A2.4 2.4 0 0 1 12 6v14a2 2 0 0 0-2-2H6a1.6 1.6 0 0 1-1.6-1.6V5.2Z"/><path d="M19.6 5.2A1.6 1.6 0 0 0 18 3.6h-4.2A2.4 2.4 0 0 0 12 6v14a2 2 0 0 1 2-2h4a1.6 1.6 0 0 0 1.6-1.6V5.2Z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.6A8.4 8.4 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6Z"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v10m0 0 4-4m-4 4-4-4M4.8 18.4h14.4"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function icon(name) { return ICONS[name] || ''; }

  /* ---------------- Bottom Sheet（支持堆叠） ---------------- */
  const SheetStack = [];

  function openSheet(opts) {
    opts = opts || {};
    const root = $('#sheet-root');
    const layer = el('div', { class: 'sheet-layer' });
    const backdrop = el('div', { class: 'backdrop' });
    const sheet = el('div', { class: 'sheet' });

    if (opts.dismissible !== false) {
      backdrop.addEventListener('click', () => closeSheet(handle));
    }

    const grab = el('div', { class: 'sheet-grab' });
    sheet.appendChild(grab);

    if (opts.title) {
      const t = el('div', { class: 'sheet-title' }, [opts.title]);
      if (opts.sub) t.appendChild(el('span', { class: 'sub', text: opts.sub }));
      sheet.appendChild(t);
    }

    const body = el('div', { class: 'sheet-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    sheet.appendChild(body);

    if (opts.actions) {
      const act = el('div', { class: 'sheet-actions' });
      if (typeof opts.actions === 'string') act.innerHTML = opts.actions;
      else act.appendChild(opts.actions);
      sheet.appendChild(act);
    }

    layer.appendChild(backdrop);
    layer.appendChild(sheet);
    layer.style.zIndex = String(80 + SheetStack.length * 2);
    root.appendChild(layer);

    const handle = {
      layer: layer, sheet: sheet, body: body,
      close: () => closeSheet(handle),
      onClose: opts.onClose || null
    };
    SheetStack.push(handle);

    // 入场（强制重排后加类，确保过渡生效）
    void layer.offsetHeight;
    layer.classList.add('is-open');
    // 拖拽关闭
    enableDrag(sheet, handle);

    return handle;
  }

  function closeSheet(handle) {
    if (!handle || handle._closing) return;
    handle._closing = true;
    handle.layer.classList.remove('is-open');
    const i = SheetStack.indexOf(handle);
    if (i >= 0) SheetStack.splice(i, 1);
    setTimeout(() => {
      if (handle.layer.parentNode) handle.layer.parentNode.removeChild(handle.layer);
      if (typeof handle.onClose === 'function') handle.onClose();
    }, 340);
  }

  function closeTopSheet() {
    if (SheetStack.length) closeSheet(SheetStack[SheetStack.length - 1]);
    return SheetStack.length > 0;
  }

  function enableDrag(sheet, handle) {
    let startY = 0, dy = 0, dragging = false;
    sheet.addEventListener('touchstart', function (e) {
      // 仅在内容滚动到顶部时允许下拉关闭
      const bodyEl = sheet.querySelector('.sheet-body');
      if (bodyEl && bodyEl.scrollTop > 2) return;
      if (e.target.closest('input, .wheel')) return;
      startY = e.touches[0].clientY; dy = 0; dragging = true;
      sheet.style.transition = 'none';
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy > 0) {
        sheet.style.transform = 'translateY(' + dy + 'px)';
        handle.layer.querySelector('.backdrop').style.opacity = String(Math.max(0, 1 - dy / 420));
      }
    }, { passive: true });
    sheet.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      const bd = handle.layer.querySelector('.backdrop');
      if (bd) bd.style.opacity = '';
      if (dy > 110) closeSheet(handle);
    });
  }

  /* ---------------- Confirm ---------------- */
  function confirm(opts) {
    return new Promise(function (resolve) {
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; resolve(v); };
      const ok = el('button', {
        class: 'btn-primary', type: 'button', text: opts.okText || '确定',
        style: opts.danger ? { background: '#E5484D', boxShadow: '0 4px 14px rgba(229,72,77,.3)' } : null
      });
      const cancel = el('button', { class: 'btn-ghost', type: 'button', text: opts.cancelText || '取消' });
      const actions = el('div', { style: { display: 'flex', gap: '10px', width: '100%' } }, [cancel, ok]);
      ok.style.flex = '1'; cancel.style.flex = '1';

      const body = el('div', {
        style: { fontSize: '13.5px', lineHeight: '1.75', color: 'var(--fg-weak)', padding: '0 2px 4px' },
        text: opts.message || ''
      });

      const h = openSheet({
        title: opts.title || '确认', body: body, actions: actions,
        onClose: () => done(false)
      });
      ok.addEventListener('click', () => { done(true); closeSheet(h); });
      cancel.addEventListener('click', () => { done(false); closeSheet(h); });
    });
  }

  /* ---------------- iOS 风格滚轮 ---------------- */
  const ITEM_H = 36;

  /**
   * 创建一列滚轮
   * @param {Array<{v:any,l:string}>} items
   * @param {number} index 初始选中
   * @param {Function} onChange (index, value) => void
   */
  function wheelColumn(items, index, onChange) {
    const w = el('div', { class: 'wheel' });
    w.style.padding = (72) + 'px 0';
    const nodes = items.map(function (it) {
      return el('div', { class: 'wheel-item', text: it.l, dataset: { v: String(it.v) } });
    });
    nodes.forEach((n) => w.appendChild(n));

    let cur = Math.max(0, Math.min(items.length - 1, index || 0));
    let raf = null;

    function sync() {
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(w.scrollTop / ITEM_H)));
      if (idx !== cur) {
        cur = idx;
        if (onChange) onChange(idx, items[idx] ? items[idx].v : null);
      }
      nodes.forEach((n, i) => n.classList.toggle('is-dim', Math.abs(i - idx) > 1));
    }

    w.addEventListener('scroll', function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    }, { passive: true });

    // 初始化位置
    requestAnimationFrame(() => {
      w.scrollTop = cur * ITEM_H;
      sync();
    });

    return {
      el: w,
      get index() { return cur; },
      get value() { return items[cur] ? items[cur].v : null; },
      set(i) { w.scrollTop = i * ITEM_H; cur = i; sync(); }
    };
  }

  /* ---------------- 杂项 ---------------- */
  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  }

  function haptic() {
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { } }
  }

  TJ.dom = { $, $$, el, esc };
  TJ.util = {
    uid, pad2, dateKey, parseKey, addDays, startOfDay, isSameDay,
    startOfWeek, weekOfMonth, toMin, fromMin, shortTime, durationText,
    MONTH_EN, DOW_EN, DOW_CN, debounce, haptic
  };
  TJ.ui = { toast, openSheet, closeSheet, closeTopSheet, confirm, wheelColumn, icon, ITEM_H };
  TJ.sheetStack = SheetStack;

})(window.TJ);
