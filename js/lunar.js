/* ============================================================
 * lunar.js — 公历/农历转换、二十四节气、干支日、建除十二神
 * 数据基于公开万年历（1900–2100），算法为通用农历推算。
 * 三端通用：H5（挂全局 DSH）/ 微信小程序 / Node（module.exports）
 * ============================================================ */
var DSH = DSH || {};
if (typeof require === "function" && typeof module !== "undefined" && module.exports) {
  // 小程序 / Node 环境：模块化加载依赖（本文件无依赖）
}

DSH.Lunar = (function () {
  "use strict";

  /* ---------- 基础数据 ---------- */
  // 农历年数据表（1900–2100），每项为 4 字节十六进制：
  // 低4位 = 闰月月份（0 表示无闰月）；0x10000 位 = 闰月大月(30天)；
  // 其余 12 位从高位到低位依次表示 1–12 月是否为大月(30天)。
  var lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2, // 1900-1909
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977, // 1910-1919
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970, // 1920-1929
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950, // 1930-1939
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557, // 1940-1949
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0, // 1950-1959
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0, // 1960-1969
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6, // 1970-1979
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570, // 1980-1989
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0, // 1990-1999
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5, // 2000-2009
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930, // 2010-2019
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530, // 2020-2029
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45, // 2030-2039
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0, // 2040-2049
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0, // 2050-2059
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4, // 2060-2069
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0, // 2070-2079
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160, // 2080-2089
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252, // 2090-2099
    0x0d520                                                                             // 2100
  ];

  var GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  var ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var ZODIAC = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
  var LUNAR_MONTH_NAMES = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];
  var LUNAR_DAY_NAMES = (function () {
    var a = [];
    for (var d = 1; d <= 30; d++) {
      var s;
      if (d === 10) s = "初十";
      else if (d === 20) s = "二十";
      else if (d === 30) s = "三十";
      else if (d < 10) s = "初" + "一二三四五六七八九"[d - 1];
      else s = "十" + "一二三四五六七八九"[d - 11];
      a.push(s);
    }
    return a;
  })();

  var SOLAR_TERM_NAMES = ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"];

  // 建除十二神（值日神）
  var JIANCHU = ["建","除","满","平","定","执","破","危","成","收","开","闭"];

  var BASE = Date.UTC(1900, 0, 31); // 1900 年正月初一
  var MIN_OFFSET = 0;
  var MAX_OFFSET = 73383; // 约 2100-12-31

  /* ---------- 基础计算 ---------- */
  function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
  function leapDays(y) { return leapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0; }
  function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function yearDays(y) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  // 某农历年按顺序排列的月份表（含闰月）
  function orderedMonths(y) {
    var leap = leapMonth(y);
    var months = [];
    for (var k = 1; k <= 12; k++) {
      if (leap > 0 && k === leap + 1) months.push({ month: leap, leap: true, days: leapDays(y) });
      months.push({ month: k, leap: false, days: monthDays(y, k) });
    }
    return months;
  }

  function daysBetween(y, m, d) {
    return Math.round((Date.UTC(y, m - 1, d) - BASE) / 86400000);
  }

  /* ---------- 公历 → 农历 ---------- */
  function solar2lunar(y, m, d) {
    var offset = daysBetween(y, m, d);
    if (offset < MIN_OFFSET || offset > MAX_OFFSET) return null;
    var year = 1900;
    while (year < 2101 && offset >= yearDays(year)) { offset -= yearDays(year); year++; }
    if (year > 2100) return null;
    var months = orderedMonths(year);
    var idx = 0;
    while (idx < months.length && offset >= months[idx].days) { offset -= months[idx].days; idx++; }
    if (idx >= months.length) return null;
    var lm = months[idx];
    return {
      year: year,
      month: lm.month,
      day: offset + 1,
      isLeap: lm.leap,
      monthName: (lm.leap ? "闰" : "") + LUNAR_MONTH_NAMES[lm.month - 1] + "月",
      dayName: LUNAR_DAY_NAMES[offset],
      yearGanZhi: ganZhiOfYear(year),
      zodiac: ZODIAC[(year - 4) % 12]
    };
  }

  /* ---------- 农历 → 公历 ---------- */
  function lunar2solar(y, m, d, isLeap) {
    if (y < 1900 || y > 2100) return null;
    var leap = leapMonth(y);
    if (isLeap && m !== leap) return null;
    var offset = 0;
    for (var i = 1900; i < y; i++) offset += yearDays(i);
    var months = orderedMonths(y);
    var target = m - 1 + (isLeap ? 1 : 0);
    if (target < 0 || target >= months.length) return null;
    if (months[target].month !== m || months[target].leap !== !!isLeap) return null;
    for (var k = 0; k < target; k++) offset += months[k].days;
    var date = new Date(BASE + (offset + d - 1) * 86400000);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  /* ---------- 干支 ---------- */
  function ganZhiOfYear(y) { return GAN[(y - 4) % 10] + ZHI[(y - 4) % 12]; }

  // 日柱（甲子=0）：以 2000-01-01 = 戊午（索引 54）为锚点，经多组万年历日期验证
  function dayGanZhiIndex(y, m, d) {
    var days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
    return ((54 + days) % 60 + 60) % 60;
  }
  function dayGanZhi(y, m, d) {
    var i = dayGanZhiIndex(y, m, d);
    return { gan: GAN[i % 10], zhi: ZHI[i % 12], index: i, ganIndex: i % 10, zhiIndex: i % 12, ganzhi: GAN[i % 10] + ZHI[i % 12] };
  }

  /* ---------- 二十四节气（Meeus 低精度太阳黄经算法，精度约 ±1 分钟） ---------- */
  // 太阳视黄经（度），JD 为儒略日（TT，与 UTC 相差 < 2 分钟，可忽略）
  function solarLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * Math.PI / 180;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
    var omega = 125.04 - 1934.136 * T;
    var lam = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
    return ((lam % 360) + 360) % 360;
  }
  // 第 n 个节气（0=小寒 … 23=冬至）的儒略日；节气对应黄经 = (285 + 15n) mod 360
  function termJD(y, n) {
    var target = (285 + 15 * n) % 360;
    var jan1JD = Date.UTC(y, 0, 1) / 86400000 + 2440587.5;
    var jd = jan1JD + 5.8 + n * 15.22; // 初估
    for (var i = 0; i < 6; i++) {
      var diff = ((solarLongitude(jd) - target + 540) % 360) - 180;
      if (Math.abs(diff) < 1e-7) break;
      jd -= diff / 0.985647; // 太阳视运动约 0.9856°/日
    }
    return jd;
  }
  function sTermDate(y, n) {
    return new Date((termJD(y, n) - 2440587.5) * 86400000);
  }
  function sTerm(y, n) {
    var dt = sTermDate(y, n);
    return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), name: SOLAR_TERM_NAMES[n], index: n };
  }
  // 某年全部节气（公历日期）
  function sTermsOfYear(y) {
    var out = [];
    for (var n = 0; n < 24; n++) out.push(sTerm(y, n));
    return out;
  }
  // 节气名 → 在数组中的序号
  function sTermIndex(name) {
    for (var i = 0; i < 24; i++) if (SOLAR_TERM_NAMES[i] === name) return i;
    return -1;
  }

  /* ---------- 建除十二神（黄历值日） ---------- */
  // 月支序（0=子）对应的建日地支；月支按月建（节气月）计算：寅月=1（立春起）
  function jianChuOfDay(year, month, day) {
    // 先用节气确定月建（寅=1 … 丑=12）
    var monthZhi = 0;
    // 十二节序：立春(2)=寅, 惊蛰(4)=卯, 清明(6)=辰, 立夏(8)=巳, 芒种(10)=午,
    // 小暑(12)=未, 立秋(14)=申, 白露(16)=酉, 寒露(18)=戌, 立冬(20)=亥, 大雪(22)=子, 小寒(0)=丑
    var jieToZhi = { 2: 2, 4: 3, 6: 4, 8: 5, 10: 6, 12: 7, 14: 8, 16: 9, 18: 10, 20: 11, 22: 0, 0: 1 }; // 节气序 → 月支序(0=子)
    var terms = sTermsOfYear(year);
    var prev = null;
    for (var n = 0; n < 24; n += 2) { // 只查"节"
      var t = terms[n];
      if (t.month < month || (t.month === month && t.day <= day)) prev = n;
    }
    if (prev === null) {
      // 1 月 1 日–小寒前，属于上一年丑月（大雪后、小寒前）
      monthZhi = 1; // 丑
    } else {
      monthZhi = jieToZhi[prev];
    }
    var dayZhi = dayGanZhi(year, month, day).zhiIndex;
    var diff = ((dayZhi - monthZhi) % 12 + 12) % 12;
    return { god: JIANCHU[diff], monthZhi: monthZhi };
  }

  /* ---------- 宜忌（按建除十二神，通用版） ---------- */
  var YIJI = {
    "建": { yi: ["出行","上任","会友","祈福"], ji: ["动土","开仓","安葬"] },
    "除": { yi: ["除旧布新","沐浴","扫舍","求医"], ji: ["嫁娶","开市","远行"] },
    "满": { yi: ["嫁娶","开市","交易","纳财"], ji: ["安葬","动土","探病"] },
    "平": { yi: ["修整","平治道路","祭祀","涂泥"], ji: ["开仓","出货","辞行"] },
    "定": { yi: ["订婚","安床","交易","签约"], ji: ["诉讼","出行","搬家"] },
    "执": { yi: ["捕捉","执法","安葬","祭祀"], ji: ["嫁娶","开市","远行"] },
    "破": { yi: ["破屋","求医","拆卸","扫除"], ji: ["嫁娶","开市","出行","签约"] },
    "危": { yi: ["安葬","祈福","祭祀"], ji: ["登高","冒险","开市","远行"] },
    "成": { yi: ["嫁娶","开市","入学","上任","签约"], ji: ["诉讼","词讼"] },
    "收": { yi: ["纳财","收藏","入宅","收账"], ji: ["安葬","出行","开市"] },
    "开": { yi: ["开市","开工","出行","求财","入学"], ji: ["安葬","破土"] },
    "闭": { yi: ["安葬","筑堤","补垣","修仓"], ji: ["开市","出行","嫁娶","动土"] }
  };

  function yiJiOfDay(y, m, d) {
    var jc = jianChuOfDay(y, m, d);
    var table = YIJI[jc.god] || { yi: [], ji: [] };
    return { god: jc.god, yi: table.yi, ji: table.ji };
  }

  /* ---------- 时辰 ---------- */
  var SHICHEN = [
    { name: "子时", start: 23, end: 1, label: "子时 23:00–01:00" },
    { name: "丑时", start: 1, end: 3, label: "丑时 01:00–03:00" },
    { name: "寅时", start: 3, end: 5, label: "寅时 03:00–05:00" },
    { name: "卯时", start: 5, end: 7, label: "卯时 05:00–07:00" },
    { name: "辰时", start: 7, end: 9, label: "辰时 07:00–09:00" },
    { name: "巳时", start: 9, end: 11, label: "巳时 09:00–11:00" },
    { name: "午时", start: 11, end: 13, label: "午时 11:00–13:00" },
    { name: "未时", start: 13, end: 15, label: "未时 13:00–15:00" },
    { name: "申时", start: 15, end: 17, label: "申时 15:00–17:00" },
    { name: "酉时", start: 17, end: 19, label: "酉时 17:00–19:00" },
    { name: "戌时", start: 19, end: 21, label: "戌时 19:00–21:00" },
    { name: "亥时", start: 21, end: 23, label: "亥时 21:00–23:00" }
  ];
  function hourToShichen(hour) {
    // 23 点起算子时
    if (hour >= 23 || hour < 1) return 0;
    return Math.floor((hour + 1) / 2);
  }

  return {
    GAN: GAN, ZHI: ZHI, ZODIAC: ZODIAC,
    SOLAR_TERM_NAMES: SOLAR_TERM_NAMES,
    SHICHEN: SHICHEN, JIANCHU: JIANCHU,
    solar2lunar: solar2lunar,
    lunar2solar: lunar2solar,
    ganZhiOfYear: ganZhiOfYear,
    dayGanZhi: dayGanZhi,
    dayGanZhiIndex: dayGanZhiIndex,
    sTermDate: sTermDate,
    sTerm: sTerm,
    sTermsOfYear: sTermsOfYear,
    sTermIndex: sTermIndex,
    jianChuOfDay: jianChuOfDay,
    yiJiOfDay: yiJiOfDay,
    hourToShichen: hourToShichen,
    leapMonth: leapMonth,
    monthDays: monthDays,
    yearDays: yearDays,
    LUNAR_MONTH_NAMES: LUNAR_MONTH_NAMES,
    LUNAR_DAY_NAMES: LUNAR_DAY_NAMES
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DSH.Lunar;
}
