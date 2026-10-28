/* ============================================================
   TJSpace · 数据层（localStorage 持久化）
   ============================================================ */
(function (TJ) {
  'use strict';

  const U = TJ.util;
  const KEY = 'tjspace.v1';

  /* 任务默认配色（扁平化淡纯色） */
  const PALETTE = [
    '#FF8A5C', '#F2A63B', '#F2C94C', '#7BC47F', '#4ECDC4',
    '#5AA9E6', '#8E7CF0', '#E884B8', '#94A3B8'
  ];

  /* 主题预设：主题色 / 前景色 / 背景色 */
  const THEMES = [
    { name: '暖橙', accent: '#FF8A3D', fg: '#14161A', bg: '#F6F7F9' },
    { name: '海蓝', accent: '#3B82F6', fg: '#101828', bg: '#F4F6FA' },
    { name: '薄荷', accent: '#10B981', fg: '#0E1B17', bg: '#F2F8F5' },
    { name: '玫瑰', accent: '#F43F5E', fg: '#1A1214', bg: '#FAF4F5' },
    { name: '靛紫', accent: '#7C5CFC', fg: '#151329', bg: '#F6F4FD' },
    { name: '石墨', accent: '#6B7280', fg: '#111214', bg: '#F2F2F4' },
    { name: '夜色', accent: '#FF9F0A', fg: '#F2F3F5', bg: '#101114' }
  ];

  /* ---------------- 颜色工具 ---------------- */
  function hex2rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(r, g, b) {
    const f = (n) => ('0' + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2);
    return '#' + f(r) + f(g) + f(b);
  }
  /** a 到 b 的插值，t 为 b 的占比 */
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function luminance(h) {
    const c = hex2rgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /* ---------------- 默认结构 ---------------- */
  function defaults() {
    return {
      version: 1,
      settings: {
        platform: 'ios',
        accent: '#FF8A3D',
        fg: '#14161A',
        bg: '#F6F7F9',
        weekStart: 1,
        ai: {
          provider: 'chatgpt',   // chatgpt | deepseek
          apiKey: '',
          baseUrl: '',
          model: '',
          temperature: 0.6,
          autoPlan: true
        },
        notify: { todo: true, course: true, lead: 10 },
        chat: []
      },
      profile: { name: 'TJer', avatar: 'T', country: '中国 · 上海', gender: '男' },
      todos: [],
      courses: [],
      free: []
    };
  }

  /* ---------------- 演示数据 ---------------- */
  function seed() {
    const s = defaults();
    const today = U.startOfDay(new Date());
    const tKey = U.dateKey(today);

    s.courses = [
      { id: U.uid('c'), title: '线性代数', location: '南楼 101', weekday: 1, start: '08:00', end: '09:35', color: PALETTE[5], teacher: '' },
      { id: U.uid('c'), title: '大学物理', location: '理科楼 203', weekday: 2, start: '10:00', end: '11:35', color: PALETTE[6], teacher: '' },
      { id: U.uid('c'), title: '数据结构', location: '信息楼 B301', weekday: 3, start: '14:00', end: '15:35', color: PALETTE[4], teacher: '' },
      { id: U.uid('c'), title: '英语视听说', location: '外语楼 105', weekday: 4, start: '08:00', end: '09:35', color: PALETTE[3], teacher: '' },
      { id: U.uid('c'), title: '体育（羽毛球）', location: '体育馆', weekday: 5, start: '16:00', end: '17:35', color: PALETTE[1], teacher: '' }
    ];

    s.todos = [
      {
        id: U.uid('t'), title: '交物理实验报告', desc: '第 4 章实验数据整理，附误差分析',
        date: tKey, time: '20:00', end: '', location: '图书馆 3F',
        color: PALETTE[0], done: false, subtasks: [], repeat: null
      },
      {
        id: U.uid('t'), title: '复习线性代数', desc: '特征值与特征向量 · 做 20 道课后题',
        date: tKey, time: '21:30', end: '', location: '宿舍',
        color: PALETTE[2], done: false, subtasks: [
          { id: U.uid('s'), title: '整理错题本', done: false }
        ], repeat: null
      }
    ];

    s.free = [
      { id: U.uid('f'), title: '背单词 30 分钟', desc: 'Anki 过一遍今天的新词', done: false },
      { id: U.uid('f'), title: '整理本周笔记', desc: '把散落的纸质笔记扫描归档', done: false },
      { id: U.uid('f'), title: '跑 3 公里', desc: '操场，配速 6 分左右', done: false }
    ];

    return s;
  }

  /* ---------------- 读写 ---------------- */
  let state = load();
  let saveTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const o = JSON.parse(raw);
      const base = defaults();
      // 浅合并，保证新增字段有默认值
      const merged = Object.assign({}, base, o);
      merged.settings = Object.assign({}, base.settings, o.settings || {});
      merged.settings.ai = Object.assign({}, base.settings.ai, (o.settings || {}).ai || {});
      merged.settings.notify = Object.assign({}, base.settings.notify, (o.settings || {}).notify || {});
      merged.profile = Object.assign({}, base.profile, o.profile || {});
      merged.todos = Array.isArray(o.todos) ? o.todos : [];
      merged.courses = Array.isArray(o.courses) ? o.courses : [];
      merged.free = Array.isArray(o.free) ? o.free : [];
      return merged;
    } catch (e) {
      console.warn('[TJSpace] 读取失败，使用初始数据', e);
      return seed();
    }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 60);
  }
  function flush() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[TJSpace] 保存失败', e); }
  }

  function reset() {
    state = seed();
    flush();
    applyTheme();
  }

  /* ---------------- 主题应用 ---------------- */
  function applyTheme() {
    const s = state.settings;
    const root = document.documentElement;
    const dark = luminance(s.bg) < 0.42;
    const p = (k, v) => root.style.setProperty(k, v);

    p('--accent', s.accent);
    p('--fg', s.fg);
    p('--bg', s.bg);
    p('--surface', dark ? mix(s.bg, s.fg, 0.085) : '#FFFFFF');
    p('--surface-2', dark ? mix(s.bg, s.fg, 0.045) : '#FAFAFC');
    p('--muted', mix(s.bg, s.fg, dark ? 0.62 : 0.55));
    p('--fg-weak', mix(s.bg, s.fg, dark ? 0.70 : 0.60));
    p('--fg-faint', mix(s.bg, s.fg, dark ? 0.46 : 0.38));
    p('--fg-ghost', mix(s.bg, s.fg, dark ? 0.26 : 0.19));
    p('--hair', mix(s.bg, s.fg, 0.10));
    p('--hair-strong', mix(s.bg, s.fg, 0.18));
    p('--accent-ink', mix(s.accent, '#000000', 0.18));

    document.documentElement.setAttribute('data-platform', s.platform);
    document.documentElement.classList.toggle('is-dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.bg);

    // 底部栏玻璃在深色主题下改为深色玻璃
    const bar = document.querySelector('.tabbar');
    if (bar) {
      bar.style.background = dark ? 'rgba(24,25,28,.52)' : 'rgba(255,255,255,.56)';
      bar.style.borderColor = dark ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.65)';
    }

    // 原生壳：系统状态栏文字颜色跟随主题
    if (window.TJ && TJ.native && TJ.native.sync) TJ.native.sync();
  }

  /* ---------------- 业务查询 ---------------- */
  /** 判断某循环任务是否落在指定日期 */
  function occursOn(todo, key) {
    const r = todo.repeat;
    if (!r) return todo.date === key;
    const d = U.parseKey(key);
    const start = U.parseKey(todo.date);
    if (d < U.startOfDay(start)) return false;
    const every = Math.max(1, parseInt(r.every, 10) || 1);

    if (r.unit === 'day') {
      const diff = Math.round((U.startOfDay(d) - U.startOfDay(start)) / 86400000);
      return diff % every === 0;
    }
    if (r.unit === 'week') {
      const days = (r.days && r.days.length) ? r.days : [start.getDay()];
      if (days.indexOf(d.getDay()) < 0) return false;
      const w1 = U.startOfWeek(start, 1), w2 = U.startOfWeek(d, 1);
      const weeks = Math.round((w2 - w1) / (86400000 * 7));
      return weeks % every === 0;
    }
    if (r.unit === 'month') {
      if (d.getDate() !== start.getDate()) return false;
      const months = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      return months % every === 0;
    }
    if (r.unit === 'year') {
      if (d.getDate() !== start.getDate() || d.getMonth() !== start.getMonth()) return false;
      return (d.getFullYear() - start.getFullYear()) % every === 0;
    }
    return false;
  }

  /** 某天的全部条目：课程 + 待办，按时间排序 */
  function entriesFor(key) {
    const d = U.parseKey(key);
    const hol = TJ.holidays.info(key);
    const out = [];

    if (!hol.off) {
      state.courses.forEach(function (c) {
        if (c.weekday === d.getDay()) {
          out.push({
            kind: 'course', id: c.id, ref: c,
            title: c.title, desc: '',
            time: c.start, end: c.end, location: c.location || '',
            color: c.color || PALETTE[5], done: false, checkbox: false
          });
        }
      });
    }

    state.todos.forEach(function (t) {
      if (occursOn(t, key)) {
        out.push({
          kind: 'todo', id: t.id, ref: t,
          title: t.title, desc: t.desc || '',
          time: t.time || '', end: t.end || '', location: t.location || '',
          color: t.color || PALETTE[0], done: !!t.done,
          checkbox: true, subtasks: t.subtasks || []
        });
      }
    });

    out.sort(function (a, b) {
      const am = a.time ? U.toMin(a.time) : 9999;
      const bm = b.time ? U.toMin(b.time) : 9999;
      if (am !== bm) return am - bm;
      return a.title.localeCompare(b.title, 'zh');
    });
    return out;
  }

  function nextColor() {
    return PALETTE[state.todos.length % PALETTE.length];
  }

  /* ---------------- 变更 ---------------- */
  function addTodo(t) {
    t.id = t.id || U.uid('t');
    t.subtasks = t.subtasks || [];
    state.todos.push(t);
    save();
    return t;
  }
  function updateTodo(id, patch) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return null;
    Object.assign(t, patch);
    save();
    return t;
  }
  function removeTodo(id) {
    const i = state.todos.findIndex((x) => x.id === id);
    if (i >= 0) state.todos.splice(i, 1);
    save();
  }
  function toggleTodo(id, done) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return;
    t.done = done === undefined ? !t.done : !!done;
    save();
  }

  function addFree(f) { f.id = f.id || U.uid('f'); state.free.push(f); save(); return f; }
  function updateFree(id, patch) {
    const f = state.free.find((x) => x.id === id);
    if (f) Object.assign(f, patch);
    save();
  }
  function removeFree(id) {
    const i = state.free.findIndex((x) => x.id === id);
    if (i >= 0) state.free.splice(i, 1);
    save();
  }

  function addCourse(c) { c.id = c.id || U.uid('c'); state.courses.push(c); save(); return c; }
  function updateCourse(id, patch) {
    const c = state.courses.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    save();
  }
  function removeCourse(id) {
    const i = state.courses.findIndex((x) => x.id === id);
    if (i >= 0) state.courses.splice(i, 1);
    save();
  }

  function clearChat() { state.settings.chat = []; save(); }

  TJ.store = {
    get state() { return state; },
    get settings() { return state.settings; },
    get todos() { return state.todos; },
    get courses() { return state.courses; },
    get free() { return state.free; },
    PALETTE, THEMES,
    save, flush, reset, applyTheme,
    entriesFor, occursOn, nextColor,
    addTodo, updateTodo, removeTodo, toggleTodo,
    addFree, updateFree, removeFree,
    addCourse, updateCourse, removeCourse,
    clearChat,
    mix, luminance
  };
})(window.TJ);
