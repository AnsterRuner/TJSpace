/* ============================================================
   TJSpace · AI 页
   ============================================================ */
(function (TJ) {
  'use strict';

  const U = TJ.util, D = TJ.dom, S = TJ.store;
  const $ = D.$, el = D.el;

  /* ---------------- 模型标识 ---------------- */
  const LOGO_GPT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.55">' +
    '<ellipse cx="12" cy="12" rx="4.05" ry="8.5"/>' +
    '<ellipse cx="12" cy="12" rx="4.05" ry="8.5" transform="rotate(60 12 12)"/>' +
    '<ellipse cx="12" cy="12" rx="4.05" ry="8.5" transform="rotate(120 12 12)"/>' +
    '</g></svg>';

  const LOGO_DS =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' +
    '<path d="M2.4 14.9c0-4.5 3.9-7.5 8.9-7.5 3.4 0 5.9 1.3 7.5 3.4l2.6-1.8c.5-.3 1.1.2.9.8l-.8 3.3.8 3.3c.2.6-.4 1.1-.9.8l-2.6-1.8c-1.6 2.1-4.1 3.4-7.5 3.4-5 0-8.9-3-8.9-7.5Z"/>' +
    '<circle cx="7.6" cy="12.9" r="1.05" fill="#fff"/>' +
    '</svg>';

  const PROVIDERS = {
    chatgpt: { label: 'ChatGPT', bg: '#111111', fg: '#FFFFFF', logo: LOGO_GPT, base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    deepseek: { label: 'DeepSeek', bg: '#1B2A6B', fg: '#FFFFFF', logo: LOGO_DS, base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' }
  };

  let busy = false;
  let lastPlanKey = '';

  /* ---------------- 顶部胶囊 ---------------- */
  function refreshPill() {
    const ai = S.settings.ai;
    const p = PROVIDERS[ai.provider] || PROVIDERS.chatgpt;
    const pill = $('#model-pill');
    pill.style.background = p.bg;
    pill.style.color = p.fg;
    $('#mp-logo').innerHTML = p.logo;
    $('#mp-name').textContent = p.label;
  }

  /* ---------------- 对话渲染 ---------------- */
  function renderChat() {
    const box = $('#chat');
    const chat = S.settings.chat;
    box.innerHTML = '';
    if (!chat.length) {
      box.appendChild(el('div', { class: 'msg sys', text: '进入本页时会自动读取课表与待办并生成时间规划' }));
      return;
    }
    chat.forEach(function (m) {
      box.appendChild(el('div', { class: 'msg ' + (m.role === 'me' ? 'me' : 'ai'), text: m.content }));
    });
    scrollBottom();
  }

  function scrollBottom() {
    const box = $('#chat');
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function pushMsg(role, content) {
    S.settings.chat.push({ role: role, content: content, ts: Date.now() });
    S.save();
    renderChat();
  }

  function showTyping() {
    const box = $('#chat');
    const t = el('div', { class: 'msg ai typing', id: 'typing' }, [
      el('i'), el('i'), el('i')
    ]);
    box.appendChild(t);
    scrollBottom();
    return t;
  }
  function hideTyping() {
    const t = $('#typing');
    if (t) t.remove();
  }

  /* ---------------- 数据快照 ---------------- */
  function snapshot() {
    const today = new Date();
    const key = U.dateKey(today);
    const entries = S.entriesFor(key);
    const hol = TJ.holidays.info(key);
    return {
      key: key,
      date: today,
      holiday: hol.name,
      makeup: hol.makeup,
      courses: entries.filter((e) => e.kind === 'course').map((e) => ({
        title: e.title, start: e.time, end: e.end, place: e.location
      })),
      todos: entries.filter((e) => e.kind === 'todo' && !e.done).map((e) => ({
        title: e.title, time: e.time, end: e.end, place: e.location, desc: e.desc
      })),
      free: S.free.filter((f) => !f.done).map((f) => ({ title: f.title, desc: f.desc }))
    };
  }

  /* ---------------- 本地规划（无 Key 兜底） ---------------- */
  function localPlan() {
    const s = snapshot();
    const d = s.date;
    const nowMin = d.getHours() * 60 + d.getMinutes();
    const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];

    // 固定块
    const blocks = [];
    s.courses.forEach(function (c) {
      if (!c.start) return;
      blocks.push({
        s: U.toMin(c.start), e: c.end ? U.toMin(c.end) : U.toMin(c.start) + 95,
        title: c.title, place: c.place, kind: 'course'
      });
    });
    s.todos.forEach(function (t) {
      if (!t.time) return;
      blocks.push({
        s: U.toMin(t.time), e: t.end ? U.toMin(t.end) : U.toMin(t.time) + 45,
        title: t.title, place: t.place, kind: 'todo', desc: t.desc
      });
    });
    blocks.sort((a, b) => a.s - b.s);

    const lines = [];
    const head = '今天是 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' + dow + '，';
    if (s.holiday) {
      lines.push(head + '正值' + s.holiday + '假期，课程停上，我把重点放在你自己的安排上。');
    } else if (!blocks.length) {
      lines.push(head + '没有固定课程和定时待办，全天由你支配。');
    } else {
      lines.push(head + '我按分钟给你排了一版：');
    }

    // 填充空档
    const freePool = s.free.slice();
    const filled = [];
    let cursor = 8 * 60;

    function pushBlock(b) { filled.push(b); }

    // 固定块按时间铺开，空档里插入自由事项（只填空档，不覆盖过去）
    blocks.forEach(function (b) {
      const gap = b.s - cursor;
      if (gap >= 35 && freePool.length && b.s > nowMin) {
        const take = Math.min(Math.floor(gap / 10) * 10, 50);
        const f = freePool.shift();
        pushBlock({ s: cursor, e: cursor + take, title: f.title, place: '', kind: 'free', desc: f.desc });
        cursor = cursor + take + 10;
      }
      pushBlock(b);
      cursor = Math.max(cursor, b.e);
    });

    // 剩余自由事项排到当下之后
    let tail = Math.max(cursor, Math.ceil(nowMin / 5) * 5 + 5);
    while (freePool.length && tail + 40 <= 22 * 60 + 30) {
      const f = freePool.shift();
      pushBlock({ s: tail, e: tail + 40, title: f.title, place: '', kind: 'free', desc: f.desc });
      tail += 50;
    }

    filled.sort((a, b) => a.s - b.s);

    if (!filled.length) {
      lines.push('');
      lines.push('现在这个点已经没有必须做的事了，建议留 20 分钟把明天的课表过一遍就早点休息。');
      return lines.join('\n');
    }

    lines.push('');
    filled.forEach(function (b) {
      const t = U.fromMin(b.s) + '–' + U.fromMin(b.e);
      const past = b.e <= nowMin;
      let line = t + '　' + b.title;
      if (b.place) line += ' · ' + b.place;
      if (past) line += '（已过）';
      lines.push(line);
      if (b.kind === 'course') lines.push('　　带上教材与笔记，课前 5 分钟到。');
      else if (b.kind === 'free') lines.push('　　' + (b.desc || '') + (b.desc ? '，' : '') + '做完就停，不追求完美。');
      else if (b.desc) lines.push('　　' + b.desc);
    });

    // 建议
    const total = filled.filter((b) => b.kind !== 'course').reduce((a, b) => a + (b.e - b.s), 0);
    lines.push('');
    if (total > 240) {
      lines.push('提醒：今天自主安排已经超过 4 小时，建议砍掉一项，把精力留给最要紧的那件。');
    } else {
      lines.push('整体节奏不紧，两个较长的空档我留给你处理自由事项，中间都留了 10 分钟走动。');
    }
    lines.push('（当前为本地排程，未连接模型。在「我的 → AI 设置」填入 API Key 后，我会用模型重新规划。）');
    return lines.join('\n');
  }

  /* ---------------- 远程调用 ---------------- */
  function buildPrompt() {
    const s = snapshot();
    const fmt = (n) => (n < 10 ? '0' + n : '' + n);
    const d = s.date;
    const lines = [];
    lines.push('日期：' + d.getFullYear() + '-' + fmt(d.getMonth() + 1) + '-' + fmt(d.getDate()) +
      ' 星期' + '日一二三四五六'[d.getDay()]);
    lines.push('当前时间：' + fmt(d.getHours()) + ':' + fmt(d.getMinutes()));
    lines.push('是否法定假期：' + (s.holiday ? ('是（' + s.holiday + '）') : (s.makeup ? '调休上班日' : '否')));
    lines.push('');
    lines.push('【今天的课程】');
    if (!s.courses.length) lines.push('（无）');
    s.courses.forEach((c) => lines.push('- ' + c.title + ' ' + c.start + '-' + c.end + ' @' + (c.place || '未填写')));
    lines.push('');
    lines.push('【今天定时的 To-do】');
    if (!s.todos.length) lines.push('（无）');
    s.todos.forEach((t) => lines.push('- ' + t.title + (t.time ? (' ' + t.time) : '') +
      (t.place ? (' @' + t.place) : '') + (t.desc ? ('｜' + t.desc) : '')));
    lines.push('');
    lines.push('【可自由安排、无固定时间的事项】');
    if (!s.free.length) lines.push('（无）');
    s.free.forEach((f) => lines.push('- ' + f.title + (f.desc ? ('｜' + f.desc) : '')));
    return lines.join('\n');
  }

  const SYSTEM_PROMPT =
    '你是 TJSpace 里的学习规划助手，服务对象是一名中国大学生。' +
    '根据用户给出的课程、定时待办与自由事项，为「今天」生成一份精确到分钟的时间规划。' +
    '要求：1) 用简体中文自然语言输出，不要表格、不要 Markdown 标题；' +
    '2) 每个时间块写成「HH:MM–HH:MM　做什么 · 在哪」；' +
    '3) 已经过去的固定安排照常列出，末尾标注「（已过）」，但不要再往过去塞新安排；空档里插入自由事项，之间留 5–10 分钟休息；' +
    '4) 若时间有冲突，直接指出并给出取舍建议；' +
    '5) 结尾用两句话给出整体节奏评价，不要客套话。';

  async function callRemote(userText, history) {
    const ai = S.settings.ai;
    const p = PROVIDERS[ai.provider] || PROVIDERS.chatgpt;
    const base = (ai.baseUrl || p.base).replace(/\/+$/, '');
    const model = ai.model || p.model;

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    (history || []).forEach(function (m) {
      messages.push({ role: m.role === 'me' ? 'user' : 'assistant', content: m.content });
    });
    messages.push({ role: 'user', content: userText });

    const ctrl = new AbortController();
    let timer;
    // 原生 HTTP 通道可能忽略 AbortSignal，因此再挂一层 Promise 超时兜底
    const timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        try { ctrl.abort(); } catch (e) { /* ignore */ }
        reject(new Error('请求超时（45s）'));
      }, 45000);
    });

    try {
      const res = await Promise.race([fetch(base + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ai.apiKey
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: Number(ai.temperature) || 0.6,
          stream: false
        }),
        signal: ctrl.signal
      }), timeout]);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + ' ' + txt.slice(0, 160));
      }
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message
        && data.choices[0].message.content;
      if (!content) throw new Error('返回内容为空');
      return content.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- 生成规划 ---------------- */
  async function generatePlan(force) {
    if (busy) return;
    const key = U.dateKey(new Date());
    if (!force && lastPlanKey === key) return;

    busy = true;
    $('#btn-replan').classList.add('is-busy');
    const typing = showTyping();

    const ai = S.settings.ai;
    let text = '';

    if (ai.apiKey) {
      try {
        const history = S.settings.chat.slice(-6);
        text = await callRemote('请为今天生成时间规划。\n\n' + buildPrompt(), history);
      } catch (err) {
        console.warn('[TJSpace] 模型调用失败', err);
        text = localPlan();
        TJ.ui.toast('模型未连通，已改用本地排程');
      }
    } else {
      // 本地排程稍微延迟，避免闪烁
      await new Promise((r) => setTimeout(r, 480));
      text = localPlan();
    }

    hideTyping();
    pushMsg('ai', text);
    lastPlanKey = key;
    busy = false;
    $('#btn-replan').classList.remove('is-busy');
  }

  /* ---------------- 自由事项 ---------------- */
  function renderFree() {
    const wrap = $('#free-list');
    const list = S.free;
    wrap.innerHTML = '';
    $('#free-count').textContent = list.filter((f) => !f.done).length + ' 项待办';

    if (!list.length) {
      wrap.appendChild(el('div', {
        style: { fontSize: '12px', color: 'var(--fg-faint)', padding: '10px 2px' },
        text: '还没有自由事项，点右下角 ＋ 添加。'
      }));
      return;
    }

    list.forEach(function (f) {
      const chk = el('button', {
        class: 'check', type: 'button',
        html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
      });
      chk.addEventListener('click', function () {
        S.updateFree(f.id, { done: !f.done });
        U.haptic();
        renderFree();
      });

      const del = el('button', {
        class: 'del', type: 'button', html: TJ.ui.icon('x')
      });
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        S.removeFree(f.id);
        renderFree();
        TJ.ui.toast('已删除');
      });

      wrap.appendChild(el('div', {
        class: 'free-item' + (f.done ? ' is-done' : '')
      }, [
        chk,
        el('div', { class: 'fi-body' }, [
          el('div', { class: 'fi-title', text: f.title }),
          f.desc ? el('div', { class: 'fi-desc', text: f.desc }) : null
        ]),
        del
      ]));
    });
  }

  function openFreeSheet() {
    const titleInput = el('input', { class: 'f-input', type: 'text', placeholder: 'To-do 名称', style: { fontSize: '15px', fontWeight: '650' } });
    const descInput = el('input', { class: 'f-input', type: 'text', placeholder: '描述（可选）' });
    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('spark') }), titleInput]),
      el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('pencil') }), descInput])
    ]);

    const ok = el('button', { class: 'btn-primary', type: 'button', text: '添加', style: { width: '100%' } });
    const actions = el('div', { style: { width: '100%' } }, [ok]);

    const h = TJ.ui.openSheet({ title: '自由事项', sub: '无固定时间', body: body, actions: actions });

    ok.addEventListener('click', function () {
      const t = (titleInput.value || '').trim();
      if (!t) { TJ.ui.toast('填一个名称'); titleInput.focus(); return; }
      S.addFree({ title: t, desc: (descInput.value || '').trim(), done: false });
      TJ.ui.closeSheet(h);
      renderFree();
      TJ.ui.toast('已添加');
    });

    setTimeout(() => titleInput.focus(), 380);
  }

  /* ---------------- 发送 ---------------- */
  async function send() {
    const input = $('#chat-input');
    const v = (input.value || '').trim();
    if (!v || busy) return;
    input.value = '';
    pushMsg('me', v);

    if (!S.settings.ai.apiKey) {
      const typing = showTyping();
      await new Promise((r) => setTimeout(r, 420));
      hideTyping();
      pushMsg('ai',
        '本地模式：我目前只能根据课表与待办做静态排程，暂时无法回答开放问题。\n' +
        '在「我的 → AI 设置」填入 ' + (PROVIDERS[S.settings.ai.provider] || PROVIDERS.chatgpt).label +
        ' 的 API Key，我就能接着聊了。');
      return;
    }

    busy = true;
    $('#btn-replan').classList.add('is-busy');
    const typing = showTyping();
    try {
      const history = S.settings.chat.slice(0, -1).slice(-6);
      const text = await callRemote('以下是当前的时间上下文：\n' + buildPrompt() + '\n\n用户提问：' + v, history);
      hideTyping();
      pushMsg('ai', text);
    } catch (err) {
      hideTyping();
      pushMsg('ai', '调用失败：' + (err && err.message ? err.message : '未知错误') + '\n请检查「我的 → AI 设置」里的 Key、模型名与 Base URL。');
    }
    busy = false;
    $('#btn-replan').classList.remove('is-busy');
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    refreshPill();
    renderChat();
    renderFree();

    $('#btn-replan').addEventListener('click', function () {
      if (busy) return;
      generatePlan(true);
    });

    $('#chat-send').addEventListener('click', send);
    $('#chat-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  function onEnter() {
    refreshPill();
    renderFree();
    if (S.settings.ai.autoPlan) generatePlan(false);
  }

  TJ.ai = {
    init, onEnter, renderFree, openFreeSheet, refreshPill, generatePlan,
    get busy() { return busy; },
    resetPlanFlag() { lastPlanKey = ''; }
  };
})(window.TJ);
