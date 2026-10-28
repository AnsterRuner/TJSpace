/* ============================================================
   TJSpace · 我的
   ============================================================ */
(function (TJ) {
  'use strict';

  const U = TJ.util, D = TJ.dom, S = TJ.store;
  const $ = D.$, $$ = D.$$, el = D.el, esc = D.esc;

  const ACCENTS = ['#FF8A3D', '#F5A623', '#FF6B6B', '#F43F5E', '#10B981',
    '#4ECDC4', '#3B82F6', '#6366F1', '#8B5CF6', '#64748B'];
  const FGS = ['#14161A', '#2B2F36', '#4B5563', '#0F172A', '#F2F3F5'];
  const BGS = ['#FFFFFF', '#F6F7F9', '#F4F6FA', '#F2F8F5', '#101114', '#1A1B1F'];

  const CHEV = '<svg class="r-chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';

  /* ---------------- 渲染 ---------------- */
  function render() {
    const p = S.state.profile;
    $('#me-avatar').textContent = (p.avatar || p.name || 'T').slice(0, 2);
    $('#me-name').textContent = p.name || 'Name…';
    $('#me-country').textContent = p.country || '未设置';
    $('#me-gender').textContent = p.gender || '未设置';

    const list = $('#me-list');
    list.innerHTML = '';

    // 主题颜色
    list.appendChild(row({
      icon: 'palette', label: '主题颜色',
      custom: el('div', { class: 'r-chips' }, [
        el('span', { class: 'chip-mini a', text: '主' }),
        el('span', { class: 'chip-mini f', text: '前' }),
        el('span', { class: 'chip-mini b', text: '背' })
      ]),
      onClick: openThemeSheet
    }));

    // 外观
    list.appendChild(row({
      icon: 'moon', label: '外观',
      value: S.settings.platform === 'ios' ? 'iOS 液态玻璃' : 'Android Material',
      onClick: openAppearanceSheet
    }));

    // AI 设置
    const ai = S.settings.ai;
    const pv = ai.provider === 'deepseek' ? 'DeepSeek' : 'ChatGPT';
    list.appendChild(row({
      icon: 'spark', label: 'AI 设置',
      value: pv + (ai.apiKey ? ' · 已连接' : ' · 未填 Key'),
      onClick: openAiSheet
    }));

    // 通知
    const n = S.settings.notify;
    list.appendChild(row({
      icon: 'bell', label: '通知',
      value: (n.todo ? 'To-do 开' : 'To-do 关') + ' / ' + (n.course ? '课程 开' : '课程 关'),
      onClick: openNotifySheet
    }));

    // 每周第一天
    list.appendChild(row({
      icon: 'week', label: '每周第一天',
      value: S.settings.weekStart === 1 ? '周一' : '周日',
      onClick: openWeekStartSheet
    }));

    // 课表管理
    list.appendChild(row({
      icon: 'book', label: '课表管理',
      value: S.state.courses.length + ' 门课程',
      onClick: openCoursesSheet
    }));

    // 清除历史对话
    list.appendChild(row({
      icon: 'trash', label: '清除历史对话',
      value: S.settings.chat.length + ' 条',
      onClick: async function () {
        const ok = await TJ.ui.confirm({
          title: '清除历史对话',
          message: '将清空 AI 页的全部对话记录，下次进入会重新生成时间规划。此操作不可撤销。',
          okText: '清除', danger: true
        });
        if (!ok) return;
        S.clearChat();
        TJ.ai.resetPlanFlag();
        TJ.ai.onEnter();
        render();
        TJ.ui.toast('已清除');
      }
    }));

    // 关于我们
    list.appendChild(row({
      icon: 'info', label: '关于我们',
      onClick: openAboutSheet
    }));
  }

  function row(o) {
    const b = el('button', { class: 'me-row', type: 'button' });
    b.appendChild(el('span', { class: 'r-ico', html: TJ.ui.icon(o.icon) }));
    b.appendChild(el('span', { class: 'r-label', text: o.label }));
    if (o.custom) b.appendChild(o.custom);
    else if (o.value) b.appendChild(el('span', { class: 'r-value', text: o.value }));
    b.appendChild(el('span', { html: CHEV, style: { display: 'flex' } }));
    b.addEventListener('click', o.onClick);
    return b;
  }

  /* ---------------- 资料编辑 ---------------- */
  function openProfileSheet() {
    const p = S.state.profile;
    const draft = Object.assign({}, p);

    const avatarIn = el('input', { class: 'f-input', type: 'text', maxlength: '2', value: draft.avatar || '' });
    const nameIn = el('input', { class: 'f-input', type: 'text', value: draft.name || '', placeholder: '昵称' });
    const countryIn = el('input', { class: 'f-input', type: 'text', value: draft.country || '', placeholder: '国家 / 地区' });

    const gSeg = el('div', { class: 'seg' });
    ['男', '女', '其他'].forEach(function (g) {
      const b = el('button', { type: 'button', text: g, class: draft.gender === g ? 'is-on' : '' });
      b.addEventListener('click', function () {
        draft.gender = g;
        $$('button', gSeg).forEach((x) => x.classList.toggle('is-on', x.textContent === g));
      });
      gSeg.appendChild(b);
    });

    const body = el('div', {}, [
      el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('pencil') }), avatarIn]),
      el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('info') }), nameIn]),
      el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('pin') }), countryIn]),
      el('div', { class: 'label', text: '性别' }),
      gSeg
    ]);

    const ok = el('button', { class: 'btn-primary', type: 'button', text: '保存', style: { width: '100%' } });
    const h = TJ.ui.openSheet({
      title: '编辑资料', body: body,
      actions: el('div', { style: { width: '100%' } }, [ok])
    });

    ok.addEventListener('click', function () {
      draft.name = (nameIn.value || '').trim() || 'TJer';
      draft.avatar = (avatarIn.value || '').trim() || draft.name.slice(0, 1);
      draft.country = (countryIn.value || '').trim();
      S.state.profile = draft;
      S.save();
      TJ.ui.closeSheet(h);
      render();
      TJ.ui.toast('已保存');
    });
  }

  /* ---------------- 主题颜色 ---------------- */
  function swatchRow(colors, current, onPick) {
    const wrap = el('div', { class: 'swatches' });
    colors.forEach(function (c) {
      const b = el('button', {
        class: 'sw' + (c.toLowerCase() === String(current).toLowerCase() ? ' is-on' : ''),
        type: 'button', style: { background: c }, dataset: { c: c }
      });
      b.addEventListener('click', function () {
        $$('.sw', wrap).forEach((x) => x.classList.toggle('is-on', x.dataset.c === c));
        onPick(c);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function openThemeSheet() {
    const s = S.settings;
    const body = el('div');

    // 预设
    const presetWrap = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' } });
    S.THEMES.forEach(function (t) {
      const active = t.accent === s.accent && t.bg === s.bg && t.fg === s.fg;
      const card = el('button', {
        type: 'button',
        style: {
          border: active ? '1.6px solid var(--accent)' : '1px solid var(--hair)',
          borderRadius: '14px', padding: '9px 4px 7px', background: t.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
        }
      }, [
        el('span', { style: { width: '20px', height: '20px', borderRadius: '50%', background: t.accent, boxShadow: '0 1px 3px rgba(0,0,0,.18)' } }),
        el('span', { style: { fontSize: '10.5px', fontWeight: '650', color: t.fg, opacity: '.75' }, text: t.name })
      ]);
      card.addEventListener('click', function () {
        s.accent = t.accent; s.fg = t.fg; s.bg = t.bg;
        S.save(); S.applyTheme();
        TJ.ui.closeSheet(h);
        openThemeSheet();
        render();
      });
      presetWrap.appendChild(card);
    });
    body.appendChild(presetWrap);

    body.appendChild(el('div', { class: 'label', text: '主题色' }));
    body.appendChild(swatchRow(ACCENTS, s.accent, function (c) {
      s.accent = c; S.save(); S.applyTheme(); render();
    }));

    body.appendChild(el('div', { class: 'label', text: '前景色' }));
    body.appendChild(swatchRow(FGS, s.fg, function (c) {
      s.fg = c; S.save(); S.applyTheme(); render();
    }));

    body.appendChild(el('div', { class: 'label', text: '背景色' }));
    body.appendChild(swatchRow(BGS, s.bg, function (c) {
      s.bg = c; S.save(); S.applyTheme(); render();
    }));

    const reset = el('button', { class: 'btn-ghost', type: 'button', text: '恢复默认', style: { width: '100%' } });
    const h = TJ.ui.openSheet({
      title: '主题颜色', sub: '实时预览',
      body: body,
      actions: el('div', { style: { width: '100%' } }, [reset])
    });
    reset.addEventListener('click', function () {
      s.accent = '#FF8A3D'; s.fg = '#14161A'; s.bg = '#F6F7F9';
      S.save(); S.applyTheme();
      TJ.ui.closeSheet(h); openThemeSheet(); render();
    });
  }

  /* ---------------- 外观 ---------------- */
  function openAppearanceSheet() {
    const s = S.settings;
    const body = el('div');
    const seg = el('div', { class: 'seg' });
    [['ios', 'iOS'], ['android', 'Android']].forEach(function (x) {
      const b = el('button', { type: 'button', text: x[1], class: s.platform === x[0] ? 'is-on' : '' });
      b.addEventListener('click', function () {
        s.platform = x[0];
        S.save(); S.applyTheme();
        $$('button', seg).forEach((y) => y.classList.toggle('is-on', y.textContent === x[1]));
        TJ.ui.toast(x[0] === 'ios' ? '已切换为 iOS 液态玻璃' : '已切换为 Material You');
      });
      seg.appendChild(b);
    });
    body.appendChild(seg);
    body.appendChild(el('div', {
      style: { fontSize: '12px', color: 'var(--fg-faint)', lineHeight: '1.75', marginTop: '12px' },
      text: 'iOS：底部为浮动胶囊玻璃栏，卡片圆角更小、阴影更轻。\nAndroid：底部为全宽 Material 3 导航栏，日期条为实心圆，卡片带左侧色带。'
    }));
    TJ.ui.openSheet({ title: '外观', body: body });
  }

  /* ---------------- AI 设置 ---------------- */
  function openAiSheet() {
    const ai = S.settings.ai;
    const draft = Object.assign({}, ai);
    const body = el('div');

    const provSeg = el('div', { class: 'seg' });
    [['chatgpt', 'ChatGPT'], ['deepseek', 'DeepSeek']].forEach(function (x) {
      const b = el('button', { type: 'button', text: x[1], class: draft.provider === x[0] ? 'is-on' : '' });
      b.addEventListener('click', function () {
        draft.provider = x[0];
        $$('button', provSeg).forEach((y) => y.classList.toggle('is-on', y.textContent === x[1]));
        modelIn.placeholder = x[0] === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';
        baseIn.placeholder = x[0] === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
        TJ.ai.refreshPill();
      });
      provSeg.appendChild(b);
    });
    body.appendChild(el('div', { class: 'label', text: '模型提供方' }));
    body.appendChild(provSeg);

    const keyIn = el('input', { class: 'f-input', type: 'password', value: draft.apiKey || '', placeholder: 'sk-…', autocomplete: 'off' });
    keyIn.addEventListener('input', function () { draft.apiKey = keyIn.value.trim(); });
    body.appendChild(el('div', { class: 'label', text: 'API Key' }));
    body.appendChild(el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('gear') }), keyIn]));

    const modelIn = el('input', {
      class: 'f-input', type: 'text', value: draft.model || '',
      placeholder: draft.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'
    });
    modelIn.addEventListener('input', function () { draft.model = modelIn.value.trim(); });
    body.appendChild(el('div', { class: 'label', text: '模型名' }));
    body.appendChild(el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('spark') }), modelIn]));

    const baseIn = el('input', {
      class: 'f-input', type: 'text', value: draft.baseUrl || '',
      placeholder: draft.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1'
    });
    baseIn.addEventListener('input', function () { draft.baseUrl = baseIn.value.trim(); });
    body.appendChild(el('div', { class: 'label', text: 'Base URL（可留空 / 可填代理）' }));
    body.appendChild(el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('dl') }), baseIn]));

    // 自动规划开关
    const autoRow = el('div', { class: 'opt-row', style: { marginTop: '14px' } }, [
      el('div', { style: { flex: '1' } }, [
        el('div', { class: 'ol-label', text: '进入 AI 页自动生成规划' }),
        el('div', { class: 'ol-sub', text: '每次进入本页调用一次模型' })
      ])
    ]);
    const sw = el('button', { class: 'switch' + (draft.autoPlan ? ' is-on' : ''), type: 'button' });
    sw.addEventListener('click', function () {
      draft.autoPlan = !draft.autoPlan;
      sw.classList.toggle('is-on', draft.autoPlan);
    });
    autoRow.appendChild(sw);
    body.appendChild(autoRow);

    body.appendChild(el('div', {
      style: { fontSize: '11.5px', color: 'var(--fg-faint)', lineHeight: '1.7', marginTop: '14px' },
      text: '提示：浏览器直连模型服务可能被 CORS 拦截。若提示未连通，可填写自建代理的 Base URL，或继续使用本地排程。'
    }));

    const test = el('button', { class: 'btn-ghost', type: 'button', text: '测试连接' });
    const ok = el('button', { class: 'btn-primary', type: 'button', text: '保存', style: { flex: '1' } });
    const actions = el('div', { style: { display: 'flex', gap: '10px', width: '100%' } }, [test, ok]);

    const h = TJ.ui.openSheet({ title: 'AI 设置', body: body, actions: actions });

    test.addEventListener('click', async function () {
      if (!draft.apiKey) { TJ.ui.toast('先填 API Key'); return; }
      test.textContent = '测试中…';
      test.disabled = true;
      const backup = S.settings.ai;
      S.settings.ai = Object.assign({}, draft);
      try {
        const res = await fetch((draft.baseUrl || (draft.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1')).replace(/\/+$/, '') + '/models', {
          headers: { Authorization: 'Bearer ' + draft.apiKey }
        });
        if (res.ok) TJ.ui.toast('连接成功');
        else TJ.ui.toast('返回 HTTP ' + res.status + '，请检查 Key / Base URL');
      } catch (e) {
        TJ.ui.toast('连接失败（可能是 CORS 或网络）');
      }
      S.settings.ai = backup;
      test.textContent = '测试连接';
      test.disabled = false;
    });

    ok.addEventListener('click', function () {
      Object.assign(S.settings.ai, draft);
      S.save();
      TJ.ai.refreshPill();
      TJ.ui.closeSheet(h);
      render();
      TJ.ui.toast('已保存');
    });
  }

  /* ---------------- 通知 ---------------- */
  function openNotifySheet() {
    const n = S.settings.notify;
    const body = el('div');

    function toggleRow(label, sub, key) {
      const r = el('div', { class: 'opt-row' }, [
        el('div', { style: { flex: '1' } }, [
          el('div', { class: 'ol-label', text: label }),
          sub ? el('div', { class: 'ol-sub', text: sub }) : null
        ])
      ]);
      const sw = el('button', { class: 'switch' + (n[key] ? ' is-on' : ''), type: 'button' });
      sw.addEventListener('click', function () {
        n[key] = !n[key];
        sw.classList.toggle('is-on', n[key]);
        S.save();
        render();
      });
      r.appendChild(sw);
      return r;
    }

    body.appendChild(toggleRow('To-do 通知', '到点提醒你该做的事', 'todo'));
    body.appendChild(toggleRow('课程通知', '课前提醒', 'course'));

    body.appendChild(el('div', { class: 'label', text: '提前提醒' }));
    const seg = el('div', { class: 'seg' });
    [5, 10, 15, 30].forEach(function (m) {
      const b = el('button', { type: 'button', text: m + ' 分', class: n.lead === m ? 'is-on' : '' });
      b.addEventListener('click', function () {
        n.lead = m; S.save();
        $$('button', seg).forEach((x) => x.classList.toggle('is-on', x.textContent === m + ' 分'));
      });
      seg.appendChild(b);
    });
    body.appendChild(seg);

    body.appendChild(el('div', {
      style: { fontSize: '11.5px', color: 'var(--fg-faint)', lineHeight: '1.7', marginTop: '14px' },
      text: '原型阶段仅保存偏好，通知能力将在打包为原生 App 后接入系统通知中心。'
    }));

    TJ.ui.openSheet({ title: '通知', body: body });
  }

  /* ---------------- 每周第一天 ---------------- */
  function openWeekStartSheet() {
    const s = S.settings;
    const body = el('div');
    const seg = el('div', { class: 'seg' });
    [[1, '周一'], [0, '周日']].forEach(function (x) {
      const b = el('button', { type: 'button', text: x[1], class: s.weekStart === x[0] ? 'is-on' : '' });
      b.addEventListener('click', function () {
        s.weekStart = x[0];
        S.save();
        $$('button', seg).forEach((y) => y.classList.toggle('is-on', y.textContent === x[1]));
        TJ.todo.render();
        render();
      });
      seg.appendChild(b);
    });
    body.appendChild(seg);
    TJ.ui.openSheet({ title: '每周第一天', body: body });
  }

  /* ---------------- 课表管理 ---------------- */
  function openCoursesSheet() {
    const body = el('div');
    const wrap = el('div');
    body.appendChild(wrap);

    function paint() {
      wrap.innerHTML = '';
      const list = S.state.courses.slice().sort((a, b) => a.weekday - b.weekday || U.toMin(a.start) - U.toMin(b.start));
      if (!list.length) {
        wrap.appendChild(el('div', { style: { fontSize: '13px', color: 'var(--fg-faint)', padding: '12px 2px' }, text: '还没有课程，点下面添加。' }));
      }
      list.forEach(function (c) {
        const item = el('button', {
          type: 'button',
          style: {
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '11px 12px', borderRadius: '15px', background: 'var(--surface-2)',
            border: '1px solid var(--hair)', marginBottom: '8px', textAlign: 'left'
          }
        }, [
          el('span', {
            style: {
              width: '38px', height: '38px', borderRadius: '12px', flex: '0 0 auto',
              background: 'color-mix(in srgb,' + c.color + ' 22%, var(--surface))',
              color: 'color-mix(in srgb,' + c.color + ' 80%, #000)',
              display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '14px'
            },
            text: c.title.slice(0, 1)
          }),
          el('span', { style: { flex: '1', minWidth: '0' } }, [
            el('span', { style: { display: 'block', fontSize: '14px', fontWeight: '650' }, text: c.title }),
            el('span', { style: { display: 'block', fontSize: '11.5px', color: 'var(--fg-faint)', marginTop: '2px' },
              text: '周' + U.DOW_CN[c.weekday] + ' · ' + U.shortTime(c.start) + '–' + U.shortTime(c.end) + (c.location ? ' · ' + c.location : '') })
          ])
        ]);
        item.addEventListener('click', function () {
          openCourseSheet(c, paint);
        });
        wrap.appendChild(item);
      });
    }

    const add = el('button', { class: 'btn-primary', type: 'button', text: '＋ 添加课程', style: { width: '100%' } });
    add.addEventListener('click', function () { openCourseSheet(null, paint); });

    TJ.ui.openSheet({ title: '课表管理', sub: S.state.courses.length + ' 门', body: body, actions: el('div', { style: { width: '100%' } }, [add]) });
    paint();
  }

  /** 课程编辑（也被 To-do 页调用） */
  function openCourseSheet(course, after) {
    const isEdit = !!course;
    const draft = course ? Object.assign({}, course) : {
      title: '', location: '', weekday: new Date().getDay(),
      start: '08:00', end: '09:35', color: S.PALETTE[5]
    };

    const body = el('div');

    // 颜色
    const swWrap = el('div', { class: 'swatches' });
    S.PALETTE.forEach(function (c) {
      const b = el('button', { class: 'sw' + (c === draft.color ? ' is-on' : ''), type: 'button', style: { background: c }, dataset: { c: c } });
      b.addEventListener('click', function () {
        draft.color = c;
        $$('.sw', swWrap).forEach((x) => x.classList.toggle('is-on', x.dataset.c === c));
      });
      swWrap.appendChild(b);
    });
    body.appendChild(swWrap);

    const titleIn = el('input', { class: 'f-input', type: 'text', placeholder: '课程名称', value: draft.title, style: { fontSize: '15px', fontWeight: '650' } });
    titleIn.addEventListener('input', () => { draft.title = titleIn.value; });
    body.appendChild(el('div', { class: 'field', style: { marginTop: '12px' } }, [el('span', { class: 'f-ico', html: TJ.ui.icon('book') }), titleIn]));

    const locIn = el('input', { class: 'f-input', type: 'text', placeholder: '上课地点', value: draft.location });
    locIn.addEventListener('input', () => { draft.location = locIn.value; });
    body.appendChild(el('div', { class: 'field' }, [el('span', { class: 'f-ico', html: TJ.ui.icon('pin') }), locIn]));

    // 星期
    body.appendChild(el('div', { class: 'label', text: '星期' }));
    const daySeg = el('div', { style: { display: 'flex', gap: '6px' } });
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      const b = el('button', {
        type: 'button', text: U.DOW_CN[d],
        style: {
          flex: '1', height: '36px', borderRadius: '11px', border: '1px solid var(--hair)',
          background: draft.weekday === d ? 'var(--accent)' : 'var(--surface-2)',
          color: draft.weekday === d ? '#fff' : 'var(--fg-weak)',
          fontSize: '13px', fontWeight: '650'
        }
      });
      b.addEventListener('click', function () {
        draft.weekday = d;
        $$('button', daySeg).forEach((x, i) => {
          const on = [1, 2, 3, 4, 5, 6, 0][i] === d;
          x.style.background = on ? 'var(--accent)' : 'var(--surface-2)';
          x.style.color = on ? '#fff' : 'var(--fg-weak)';
          x.style.borderColor = on ? 'transparent' : 'var(--hair)';
        });
      });
      daySeg.appendChild(b);
    });
    body.appendChild(daySeg);

    // 时间
    const startChip = el('button', { class: 'dt-chip', type: 'button' }, [
      el('span', { class: 'dc-ico', html: TJ.ui.icon('clock') }),
      el('span', { class: 'dc-tx', text: U.shortTime(draft.start) })
    ]);
    const endChip = el('button', { class: 'dt-chip', type: 'button' }, [
      el('span', { class: 'dc-ico', html: TJ.ui.icon('clock') }),
      el('span', { class: 'dc-tx', text: U.shortTime(draft.end) })
    ]);
    startChip.addEventListener('click', async function () {
      const v = await pickTime(draft.start, '上课时间');
      if (v) { draft.start = v; startChip.querySelector('.dc-tx').textContent = U.shortTime(v); }
    });
    endChip.addEventListener('click', async function () {
      const v = await pickTime(draft.end, '下课时间');
      if (v) { draft.end = v; endChip.querySelector('.dc-tx').textContent = U.shortTime(v); }
    });
    body.appendChild(el('div', { class: 'label', text: '上课 / 下课时间' }));
    body.appendChild(el('div', { class: 'dt-row' }, [startChip, endChip]));

    const ok = el('button', { class: 'btn-primary', type: 'button', text: '确认' });
    const del = isEdit ? el('button', { class: 'btn-danger', type: 'button', text: '删除' }) : null;
    const actions = el('div', { style: { display: 'flex', gap: '10px', width: '100%', alignItems: 'center' } }, [
      del, ok
    ]);
    ok.style.flex = '1';

    const h = TJ.ui.openSheet({ title: isEdit ? '编辑课程' : '添加课程', body: body, actions: actions });

    if (del) {
      del.addEventListener('click', async function () {
        const yes = await TJ.ui.confirm({ title: '删除课程', message: '「' + course.title + '」将从课表中移除。', okText: '删除', danger: true });
        if (!yes) return;
        S.removeCourse(course.id);
        TJ.ui.closeSheet(h);
        if (after) after();
        TJ.todo.render();
        TJ.ui.toast('已删除');
      });
    }

    ok.addEventListener('click', function () {
      if (!(draft.title || '').trim()) { TJ.ui.toast('填一下课程名称'); titleIn.focus(); return; }
      draft.title = draft.title.trim();
      if (isEdit) S.updateCourse(course.id, draft);
      else S.addCourse(draft);
      TJ.ui.closeSheet(h);
      if (after) after();
      TJ.todo.render();
      render();
      TJ.ui.toast('已保存');
    });
  }

  /** 时间滚轮选择器（独立小面板） */
  function pickTime(initial, title) {
    return new Promise(function (resolve) {
      let settled = false;
      const t = initial ? U.toMin(initial) : 8 * 60;
      const box = el('div', { class: 'wheelbox' }, [el('div', { class: 'wheel-band' })]);
      const hours = [], mins = [];
      for (let h = 0; h < 24; h++) hours.push({ v: h, l: U.pad2(h) + ' 时' });
      for (let m = 0; m < 60; m++) mins.push({ v: m, l: U.pad2(m) + ' 分' });
      const wh = TJ.ui.wheelColumn(hours, Math.floor(t / 60));
      const wm = TJ.ui.wheelColumn(mins, t % 60);
      box.appendChild(wh.el); box.appendChild(wm.el);

      const ok = el('button', { class: 'btn-primary', type: 'button', text: '确定', style: { width: '100%' } });
      const h = TJ.ui.openSheet({
        title: title || '选择时间', body: box,
        actions: el('div', { style: { width: '100%' } }, [ok]),
        onClose: function () { if (!settled) { settled = true; resolve(null); } }
      });
      ok.addEventListener('click', function () {
        settled = true;
        resolve(U.fromMin(wh.value * 60 + wm.value));
        TJ.ui.closeSheet(h);
      });
    });
  }

  /* ---------------- 关于我们 ---------------- */
  function openAboutSheet() {
    const body = el('div', { style: { padding: '4px 2px 8px' } }, [
      el('div', {
        style: {
          width: '64px', height: '64px', borderRadius: '18px', margin: '4px auto 14px',
          background: 'linear-gradient(150deg, color-mix(in srgb,var(--accent) 92%,#fff), var(--accent))',
          color: '#fff', display: 'grid', placeItems: 'center', fontSize: '26px', fontWeight: '800',
          boxShadow: '0 10px 26px color-mix(in srgb,var(--accent) 32%,transparent)'
        }, text: 'TJ'
      }),
      el('div', { style: { textAlign: 'center', fontSize: '16px', fontWeight: '800', letterSpacing: '-.2px' }, text: 'TJSpace' }),
      el('div', { style: { textAlign: 'center', fontSize: '11.5px', color: 'var(--fg-faint)', marginTop: '4px' }, text: 'v0.1.0 · prototype' }),
      el('div', {
        style: { marginTop: '22px', padding: '18px', borderRadius: '16px', background: 'var(--surface-2)', border: '1px dashed var(--hair-strong)', textAlign: 'center', fontSize: '12px', color: 'var(--fg-faint)', lineHeight: '1.8' },
        text: '此区域预留，由人工撰写。'
      })
    ]);
    TJ.ui.openSheet({ title: '关于我们', body: body });
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    render();
    $('#btn-edit-profile').addEventListener('click', openProfileSheet);
  }

  TJ.me = { init, render, openCourseSheet, openCoursesSheet, openThemeSheet, openAiSheet };
})(window.TJ);
