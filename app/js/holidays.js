/* ============================================================
   TJSpace · 中国大陆放假 / 调休数据
   数据来源：国务院办公厅《关于2026年部分节假日安排的通知》
            国办发明电〔2025〕7号（2025-11-04 发布）
   ============================================================ */
(function (TJ) {
  'use strict';

  // 放假区间（含首尾）
  const RANGES = [
    { name: '元旦', from: '2026-01-01', to: '2026-01-03' },
    { name: '春节', from: '2026-02-15', to: '2026-02-23' },
    { name: '清明', from: '2026-04-04', to: '2026-04-06' },
    { name: '劳动节', from: '2026-05-01', to: '2026-05-05' },
    { name: '端午', from: '2026-06-19', to: '2026-06-21' },
    { name: '中秋', from: '2026-09-25', to: '2026-09-27' },
    { name: '国庆', from: '2026-10-01', to: '2026-10-07' }
  ];

  // 调休上班日（周末补班）
  const MAKEUP = [
    '2026-01-04', // 元旦补班（周日）
    '2026-02-14', // 春节补班（周六）
    '2026-02-28', // 春节补班（周六）
    '2026-05-09', // 劳动节补班（周六）
    '2026-09-20', // 国庆补班（周日）
    '2026-10-10'  // 国庆补班（周六）
  ];

  const OFF = Object.create(null);     // key -> 节日名
  const MAKEUP_SET = Object.create(null);

  function eachDay(from, to, cb) {
    const a = TJ.util.parseKey(from);
    const b = TJ.util.parseKey(to);
    let d = new Date(a.getTime());
    let guard = 0;
    while (d <= b && guard++ < 60) {
      cb(TJ.util.dateKey(d));
      d = TJ.util.addDays(d, 1);
    }
  }

  RANGES.forEach(function (r) {
    eachDay(r.from, r.to, function (k) { OFF[k] = r.name; });
  });
  MAKEUP.forEach(function (k) { MAKEUP_SET[k] = true; });

  /**
   * @param {string} key 'YYYY-MM-DD'
   * @returns {{off:boolean, name:string|null, makeup:boolean, weekend:boolean}}
   */
  function info(key) {
    const d = TJ.util.parseKey(key);
    const dow = d.getDay();
    const makeup = !!MAKEUP_SET[key];
    const off = !!OFF[key];
    return {
      off: off,
      name: off ? OFF[key] : null,
      makeup: makeup,
      weekend: (dow === 0 || dow === 6) && !makeup
    };
  }

  /** 是否为「休息日」（周末或法定假日，且不是补班日） */
  function isRest(key) {
    const i = info(key);
    if (i.makeup) return false;
    return i.off || i.weekend;
  }

  /** 今天是否处在某个假期中，返回节日名 */
  function holidayName(key) {
    return OFF[key] || null;
  }

  TJ.holidays = { info, isRest, holidayName, RANGES, MAKEUP };
})(window.TJ);
