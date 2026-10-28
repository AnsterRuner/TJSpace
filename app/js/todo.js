/* ============================================================
   TJSpace · To-do 页
   ============================================================ */
(function (TJ) {
  'use strict';

  const U = TJ.util, D = TJ.dom, S = TJ.store;
  const $ = D.$, el = D.el, esc = D.esc;

  let viewDate = U.startOfDay(new Date());   // 当前选中日
  let stripBase = null;                      // 当前周起始

  /* ---------------- 渲染 ---------------- */
  function render() {
    renderHead();
    renderStrip();
    renderList();
  }

  function renderHead() {
    const ws = S.settings.weekStart;
    $('#todo-month').textContent = U.MONTH_EN[viewDate.getMonth()];
    $('#todo-weekno').textContent = '第 ' + U.weekOfMonth(viewDate, ws) + ' 周';

    const todayBtn = $('#btn-today');
    todayBtn.classList.toggle('is-off', U.isSameDay(viewDate, new Date()));

    // 日期注记
    const note = $('#daynote');
    const key = U.dateKey(viewDate);
    const hol = TJ.holidays.info(key);
    if (hol.name) {
      note.hidden = false;
      note.innerHTML = '<b>' + esc(hol.name) + '假期</b><span>· 今日课程已自动隐藏</span>';
    } else if (hol.makeup) {
      note.hidden = false;
      note.innerHTML = '<b style="color:#D9534F">调休上班日</b><span>· 按工作日安排</span>';
    } else {
      note.hidden = true;
    }
  }

  function renderStrip() {
    const ws = S.settings.weekStart;
    stripBase = U.startOfWeek(viewDate, ws);
    const wrap = $('#weekstrip');
    wrap.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = U.addDays(stripBase, i);
      const key = U.dateKey(d);
      const hol = TJ.holidays.info(key);
      const isToday = U.isSameDay(d, today);
      const isSel = U.isSameDay(d, viewDate);
      const isPast = d < U.startOfDay(today) && !isToday;

      const btn = el('button', {
        class: 'day' + (isPast ? ' is-past' : '') + (isToday ? ' is-today' : '') +
               (isSel ? ' is-selected' : '') + (!isPast && !isToday ? ' is-future' : '') +
               (hol.off ? ' is-holiday' : '') + (hol.makeup ? ' is-makeup' : ''),
        type: 'button',
        dataset: { date: key }
      }, [
        el('span', { class: 'dow', text: U.DOW_EN[d.getDay()] }),
        el('span', { class: 'dnum', text: String(d.getDate()) })
      ]);
      wrap.appendChild(btn);
    }
  }

  function timeLabel(e) {
    if (!e.time) return '';
    return U.shortTime(e.time) + (e.end ? '–' + U.shortTime(e.end) : '');
  }

  function renderList() {
    const key = U.dateKey(viewDate);
    const list = S.entriesFor(key);
    const wrap = $('#tasklist');
    wrap.innerHTML = '';

    if (!list.length) {
      wrap.appendChild(el('div', { class: 'empty' }, [
        el('div', { class: 'em-ico', text: '☾' }),
        el('div', { text: '这一天还没有安排' }),
        el('div', { text: '点右下角的 ＋ 添加一条 To-do' })
      ]));
      return;
    }

    list.forEach(function (e, i) {
      const parts = [];
      parts.push(el('span', { class: 'ttl', text: e.title }));
      const tl = timeLabel(e);
      if (tl) { parts.push(el('span', { class: 'dot', text: '·' })); parts.push(el('span', { class: 'meta', text: tl })); }
      if (e.location) { parts.push(el('span', { class: 'dot', text: '·' })); parts.push(el('span', { class: 'meta', text: e.location })); }

      const card = el('article', {
        class: 'task' + (e.done ? ' is-done' : ''),
        style: { '--tc': e.color, animationDelay: (i * 26) + 'ms' },
        dataset: { id: e.id, kind: e.kind }
      });

      if (e.checkbox) {
        const chk = el('button', {
          class: 'check', type: 'button', 'aria-label': '完成',
          html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
        });
        chk.addEventListener('click', function (ev) {
          ev.stopPropagation();
          S.toggleTodo(e.id, !e.done);
          U.haptic();
          renderList();
        });
        card.appendChild(chk);
      }

      card.appendChild(el('div', { class: 'ico', text: (e.title || '?').trim().charAt(0) }));

      const tx = el('div', { class: 'tx' }, [
        el('div', { class: 'tx1' }, parts)
      ]);
      if (e.desc) tx.appendChild(el('div', { class: 'tx2', text: e.desc }));
      else if (e.kind === 'course') tx.appendChild(el('div', { class: 'tx2', text: '课程 · 每周' + U.DOW_CN[U.parseKey(key).getDay()] }));
      card.appendChild(tx);

      const eb = el('button', {
        class: 'editbtn', type: 'button', 'aria-label': '编辑',
        html: '<svg viewBox="0 0 24 24"><path d="M3 21l1.2-4.2L16.4 4.6a2.5 2.5 0 0 1 3.5 0l.5.5a2.5 2.5 0 0 1 0 3.5L8.2 20.8 4 22l-1-1Z"/></svg>'
      });
      eb.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (e.kind === 'course') TJ.me.openCourseSheet(e.ref);
        else openTaskSheet({ mode: 'edit', todo: e.ref });
      });
      card.appendChild(eb);

      card.addEventListener('click', function () {
        if (e.kind === 'course') TJ.me.openCourseSheet(e.ref);
        else openTaskSheet({ mode: 'edit', todo: e.ref });
      });

      wrap.appendChild(card);
    });
  }

  /* ---------------- 日期条手势 ---------------- */
  function bindStrip() {
    let sx = 0, sy = 0, tracking = false;
    const strip = $('#weekstrip');

    strip.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });

    strip.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        shiftWeek(dx < 0 ? 1 : -1);
      }
    });

    strip.addEventListener('click', function (e) {
      const b = e.target.closest('.day');
      if (!b) return;
      viewDate = U.parseKey(b.dataset.date);
      U.haptic();
      render();
    });
  }

  function shiftWeek(n) {
    viewDate = U.addDays(viewDate, n * 7);
    render();
  }

  /* ============================================================
     二级菜单：新建 / 编辑 To-do
     ============================================================ */
  function openTaskSheet(opts) {
    opts = opts || {};
    const isEdit = opts.mode === 'edit';
    const todo = opts.todo || null;

    const draft = {
      color: todo ? todo.color : S.nextColor(),
      repeatOn: !!(todo && todo.repeat),
      title: todo ? todo.title : '',
      desc: todo ? (todo.desc || '') : '',
      location: todo ? (todo.location || '') : '',
      date: todo ? todo.date : U.dateKey(viewDate),
      time: todo ? (todo.time || '') : '20:00',
      end: todo ? (todo.end || '') : '',
      subtasks: todo ? JSON.parse(JSON.stringify(todo.subtasks || [])) : [],
      repeat: todo && todo.repeat ? JSON.parse(JSON.stringify(todo.repeat))
        : { every: 1, unit: 'week', days: [U.parseKey(todo ? todo.date : U.dateKey(viewDate)).getDay()] }
    };

    const body = el('div');

    /* --- 颜色 --- */
    const swWrap = el('div', { class: 'swatches' });
    S.PALETTE.forEach(function (c) {
      const b = el('button', {
        class: 'sw' + (c === draft.color ? ' is-on' : ''), type: 'button',
        style: { background: c }, dataset: { c: c }
      });
      b.addEventListener('click', function () {
        draft.color = c;
        D.$$('.sw', swWrap).forEach((x) => x.classList.toggle('is-on', x.dataset.c === c));
      });
      swWrap.appendChild(b);
    });
    body.appendChild(swWrap);

    /* --- 一次性 / 循环（可折叠） --- */
    const modeHead = el('button', {
      class: 'opt-row', type: 'button', style: { borderBottom: 'none', padding: '14px 2px 10px' }
    }, [
      el('span', { class: 'ol-label', text: '重复方式' }),
      el('span', {
        class: 'r-value', text: draft.repeatOn ? '循环 To-do' : '一次性 To-do',
        style: { marginRight: '4px' }
      }),
      el('span', {
        class: 'r-chev-wrap',
        style: { display: 'flex', color: 'var(--fg-ghost)' },
        html: '<svg class="r-chev" viewBox="0 0 24 24" width="16" height="16"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      })
    ]);

    const modeBody = el('div', { style: { overflow: 'hidden', maxHeight: '0', transition: 'max-height .3s cubic-bezier(.22,1,.36,1),opacity .25s', opacity: '0' } });
    const seg = el('div', { class: 'seg', style: { margin: '0 0 4px' } });
    const bOnce = el('button', { class: 'is-on', type: 'button', text: '一次性' });
    const bLoop = el('button', { type: 'button', text: '循环' });
    seg.appendChild(bOnce); seg.appendChild(bLoop);
    modeBody.appendChild(seg);

    // 循环参数
    const loopPanel = el('div', { style: { display: 'none', marginTop: '10px' } });
    const unitSeg = el('div', { class: 'seg' });
    const units = [['day', '天'], ['week', '周'], ['month', '月'], ['year', '年']];
    const unitBtns = {};
    units.forEach(function (u) {
      const b = el('button', { type: 'button', text: u[1], dataset: { u: u[0] } });
      if (draft.repeat.unit === u[0]) b.classList.add('is-on');
      b.addEventListener('click', function () {
        draft.repeat.unit = u[0];
        Object.keys(unitBtns).forEach((k) => unitBtns[k].classList.toggle('is-on', k === u[0]));
        dayRow.style.display = u[0] === 'week' ? 'flex' : 'none';
      });
      unitBtns[u[0]] = b;
      unitSeg.appendChild(b);
    });

    const everyRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' } }, [
      el('span', { style: { fontSize: '13px', fontWeight: '650', color: 'var(--fg-weak)' }, text: '循环每' }),
      (function () {
        const inp = el('input', { class: 'f-input', type: 'number', min: '1', max: '99', value: String(draft.repeat.every), style: { width: '54px', textAlign: 'center', border: '1px solid var(--hair)', borderRadius: '10px', padding: '7px 0', background: 'var(--surface-2)' } });
        inp.addEventListener('input', function () { draft.repeat.every = Math.max(1, parseInt(inp.value, 10) || 1); });
        return inp;
      })()
    ]);

    const dayRow = el('div', { style: { display: 'flex', gap: '6px', marginTop: '12px' } });
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (lb, i) {
      const b = el('button', {
        type: 'button', text: lb,
        style: {
          flex: '1', height: '34px', borderRadius: '11px', border: '1px solid var(--hair)',
          background: 'var(--surface-2)', fontSize: '13px', fontWeight: '650', color: 'var(--fg-weak)'
        }
      });
      const on = function () { return draft.repeat.days.indexOf(i) >= 0; };
      const paint = function () {
        b.style.background = on() ? 'var(--accent)' : 'var(--surface-2)';
        b.style.color = on() ? '#fff' : 'var(--fg-weak)';
        b.style.borderColor = on() ? 'transparent' : 'var(--hair)';
      };
      b.addEventListener('click', function () {
        const idx = draft.repeat.days.indexOf(i);
        if (idx >= 0) draft.repeat.days.splice(idx, 1); else draft.repeat.days.push(i);
        if (!draft.repeat.days.length) draft.repeat.days.push(i);
        paint();
      });
      paint();
      dayRow.appendChild(b);
    });

    loopPanel.appendChild(everyRow);
    loopPanel.appendChild(el('div', { class: 'label', text: '循环单位' }));
    loopPanel.appendChild(unitSeg);
    loopPanel.appendChild(dayRow);
    dayRow.style.display = draft.repeat.unit === 'week' ? 'flex' : 'none';
    modeBody.appendChild(loopPanel);

    let modeOpen = false;
    function setModeOpen(v) {
      modeOpen = v;
      modeBody.style.maxHeight = v ? '320px' : '0';
      modeBody.style.opacity = v ? '1' : '0';
      modeHead.querySelector('.r-chev').style.transform = v ? 'rotate(90deg)' : '';
      modeHead.querySelector('.r-chev').style.transition = 'transform .25s';
    }
    modeHead.addEventListener('click', function () { setModeOpen(!modeOpen); });

    function setRepeat(on) {
      draft.repeatOn = on;
      bOnce.classList.toggle('is-on', !on);
      bLoop.classList.toggle('is-on', on);
      loopPanel.style.display = on ? 'block' : 'none';
      modeHead.querySelector('.r-value').textContent = on ? '循环 To-do' : '一次性 To-do';
      dateChipLabel();
    }
    bOnce.addEventListener('click', () => setRepeat(false));
    bLoop.addEventListener('click', () => setRepeat(true));

    body.appendChild(modeHead);
    body.appendChild(modeBody);

    /* --- 标题 / 描述 / 地点 --- */
    const titleInput = el('input', {
      class: 'f-input', type: 'text', placeholder: '填入 To-do…', value: draft.title,
      style: { fontSize: '16px', fontWeight: '650' }
    });
    titleInput.addEventListener('input', function () { draft.title = titleInput.value; });
    body.appendChild(el('div', { class: 'field', style: { marginTop: '4px' } }, [
      el('span', { class: 'f-ico', html: TJ.ui.icon('check') }), titleInput
    ]));

    const descInput = el('input', { class: 'f-input', type: 'text', placeholder: '自定义描述（可选）', value: draft.desc });
    descInput.addEventListener('input', function () { draft.desc = descInput.value; });
    body.appendChild(el('div', { class: 'field' }, [
      el('span', { class: 'f-ico', html: TJ.ui.icon('pencil') }), descInput
    ]));

    const locInput = el('input', { class: 'f-input', type: 'text', placeholder: '地点（可选）', value: draft.location });
    locInput.addEventListener('input', function () { draft.location = locInput.value; });
    body.appendChild(el('div', { class: 'field' }, [
      el('span', { class: 'f-ico', html: TJ.ui.icon('pin') }), locInput
    ]));

    /* --- 子任务 --- */
    const subWrap = el('div');
    function renderSubs() {
      subWrap.innerHTML = '';
      draft.subtasks.forEach(function (s, i) {
        const inp = el('input', { class: 'f-input', type: 'text', placeholder: '子任务 ' + (i + 1), value: s.title });
        inp.addEventListener('input', function () { s.title = inp.value; });
        const del = el('button', {
          class: 'sub-del', type: 'button', html: TJ.ui.icon('x')
        });
        del.addEventListener('click', function () {
          draft.subtasks.splice(i, 1);
          renderSubs();
        });
        subWrap.appendChild(el('div', { class: 'sub-row' }, [
          el('div', { class: 'field', style: { flex: '1', padding: '8px 12px' } }, [
            el('span', { class: 'f-ico', html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' }), inp
          ]),
          del
        ]));
      });
      if (!draft.repeatOn) subWrap.appendChild(addSubBtn);
    }
    const addSubBtn = el('button', {
      class: 'btn-text', type: 'button', style: { marginTop: '8px' },
      text: '＋ 子任务'
    });
    addSubBtn.addEventListener('click', function () {
      draft.subtasks.push({ id: U.uid('s'), title: '', done: false });
      renderSubs();
      const inputs = D.$$('.f-input', subWrap);
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    body.appendChild(subWrap);

    /* --- 日期 / 时间 --- */
    const dateChip = el('button', { class: 'dt-chip', type: 'button' }, [
      el('span', { class: 'dc-ico', html: TJ.ui.icon('cal') }),
      el('span', { class: 'dc-tx' })
    ]);
    const timeChip = el('button', { class: 'dt-chip', type: 'button' }, [
      el('span', { class: 'dc-ico', html: TJ.ui.icon('clock') }),
      el('span', { class: 'dc-tx' })
    ]);

    function dateChipLabel() {
      const d = U.parseKey(draft.date);
      dateChip.querySelector('.dc-tx').textContent =
        (draft.repeatOn ? '起始 ' : '') + (d.getMonth() + 1) + '月' + d.getDate() + '日';
      timeChip.querySelector('.dc-tx').textContent = draft.time ? U.shortTime(draft.time) : '时间';
    }

    /* 滚轮区 */
    const wheelWrap = el('div', { class: 'wheel-wrap' });
    let wheelMode = null;
    let wY = null, wM = null, wD = null, wH = null, wMin = null;

    function buildWheels(mode) {
      wheelWrap.innerHTML = '';
      const box = el('div', { class: 'wheelbox' });
      box.appendChild(el('div', { class: 'wheel-band' }));

      if (mode === 'date') {
        const d = U.parseKey(draft.date);
        const thisYear = new Date().getFullYear();
        const years = [];
        for (let y = thisYear - 1; y <= thisYear + 3; y++) years.push({ v: y, l: y + ' 年' });
        wY = TJ.ui.wheelColumn(years, years.findIndex((x) => x.v === d.getFullYear()), function () { onDateChange(); });
        const months = [];
        for (let m = 1; m <= 12; m++) months.push({ v: m, l: m + ' 月' });
        wM = TJ.ui.wheelColumn(months, d.getMonth(), function () { onDateChange(); });
        const days = [];
        for (let i = 1; i <= 31; i++) days.push({ v: i, l: i + ' 日' });
        wD = TJ.ui.wheelColumn(days, d.getDate() - 1, function () { onDateChange(); });
        box.appendChild(wY.el); box.appendChild(wM.el); box.appendChild(wD.el);
      } else {
        const hours = [];
        for (let h = 0; h < 24; h++) hours.push({ v: h, l: U.pad2(h) + ' 时' });
        const mins = [];
        for (let m = 0; m < 60; m += 1) mins.push({ v: m, l: U.pad2(m) + ' 分' });
        const t = draft.time ? U.toMin(draft.time) : 20 * 60;
        wH = TJ.ui.wheelColumn(hours, Math.floor(t / 60), function () { onTimeChange(); });
        wMin = TJ.ui.wheelColumn(mins, t % 60, function () { onTimeChange(); });
        box.appendChild(wH.el); box.appendChild(wMin.el);
      }
      wheelWrap.appendChild(box);
    }

    function onDateChange() {
      if (!wY) return;
      const y = wY.value, m = wM.value, day = wD.value;
      const dim = new Date(y, m, 0).getDate();
      const clamped = Math.min(day, dim);
      if (clamped !== day) wD.set(clamped - 1);
      draft.date = y + '-' + U.pad2(m) + '-' + U.pad2(clamped);
      dateChipLabel();
    }
    function onTimeChange() {
      if (!wH) return;
      draft.time = U.fromMin(wH.value * 60 + wMin.value);
      dateChipLabel();
    }

    function openWheels(mode) {
      if (wheelMode === mode) {
        wheelMode = null;
        wheelWrap.classList.remove('is-open');
        dateChip.classList.remove('is-on');
        timeChip.classList.remove('is-on');
        return;
      }
      wheelMode = mode;
      buildWheels(mode);
      wheelWrap.classList.add('is-open');
      dateChip.classList.toggle('is-on', mode === 'date');
      timeChip.classList.toggle('is-on', mode === 'time');
    }
    dateChip.addEventListener('click', () => openWheels('date'));
    timeChip.addEventListener('click', () => openWheels('time'));

    body.appendChild(wheelWrap);

    /* 底部动作 */
    const okBtn = el('button', { class: 'btn-primary', type: 'button', text: '确认', style: { flex: '0 0 auto', padding: '12px 22px' } });
    const actions = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' } }, [
      el('div', { style: { display: 'flex', gap: '8px', flex: '1', minWidth: '0' } }, [dateChip, timeChip]),
      okBtn
    ]);

    dateChipLabel();
    renderSubs();
    setRepeat(draft.repeatOn);
    setModeOpen(false);

    const handle = TJ.ui.openSheet({
      title: isEdit ? '编辑 To-do' : '新建 To-do',
      sub: isEdit ? '' : '一次性 / 循环',
      body: body,
      actions: actions
    });

    okBtn.addEventListener('click', function () {
      const title = (draft.title || '').trim();
      if (!title) {
        TJ.ui.toast('先给这条 To-do 起个名字');
        titleInput.focus();
        return;
      }
      const payload = {
        title: title,
        desc: (draft.desc || '').trim(),
        location: (draft.location || '').trim(),
        date: draft.date,
        time: draft.time || '',
        end: '',
        color: draft.color,
        subtasks: draft.repeatOn ? [] : draft.subtasks.filter((s) => (s.title || '').trim()),
        repeat: draft.repeatOn ? JSON.parse(JSON.stringify(draft.repeat)) : null
      };

      if (isEdit) {
        S.updateTodo(todo.id, payload);
        TJ.ui.toast('已保存');
      } else {
        S.addTodo(Object.assign({ done: false }, payload));
        viewDate = U.parseKey(draft.date);
        TJ.ui.toast('已添加');
      }
      TJ.ui.closeSheet(handle);
      render();
      TJ.app.refreshAiHint();
    });
  }

  /* ---------------- 事件绑定 ---------------- */
  function init() {
    bindStrip();
    $('#btn-today').addEventListener('click', function () {
      viewDate = U.startOfDay(new Date());
      U.haptic();
      render();
    });
    $('#fab').addEventListener('click', function () {
      if (TJ.app.current() === 'ai') TJ.ai.openFreeSheet();
      else if (TJ.app.current() === 'me' || TJ.app.current() === 'hw') return;
      else openTaskSheet({ mode: 'create' });
    });
  }

  TJ.todo = { init, render, openTaskSheet, get viewDate() { return viewDate; } };
})(window.TJ);
