/* ============================================================
 * app.js — 页面主控：表单读取、各板块渲染、导航、呼吸动画、存储
 * 依赖 lunar/bazi/zodiac/content/compat/emotion。浏览器端运行。
 * ============================================================ */
var DSH = DSH || {};

DSH.App = (function () {
  "use strict";

  var L = DSH.Lunar, B = DSH.Bazi, Z = DSH.Zodiac, C = DSH.Content, CM = DSH.Compat, EM = DSH.Emotion;

  /* ---------- 五行配色 ---------- */
  var ELEM_COLOR = { "木": "#4fae7f", "火": "#d95f4b", "土": "#c9a35c", "金": "#d9cfae", "水": "#5b83a8" };
  var ELEM_ORDER = ["木", "火", "土", "金", "水"];

  /* ---------- 九宫飞星（2025 乙巳年，立春后生效） ---------- */
  var STAR_INFO = {
    1: { name: "一白贪狼星", luck: "吉", theme: "人缘、桃花、事业贵人", tip: "催旺人缘桃花的好位置，宜保持明亮整洁，可放置粉色或白色装饰。" },
    2: { name: "二黑巨门星", luck: "凶", theme: "病符，主健康困扰", tip: "避免在此方位久坐或堆放杂物；可摆放金属葫芦或铜器化解；家中长辈注意体检。" },
    3: { name: "三碧禄存星", luck: "凶", theme: "是非、口舌、官非", tip: "此方位忌红色装饰与利器；多读书静心，避免与人争执。" },
    4: { name: "四绿文曲星", luck: "吉", theme: "学业、考试、文昌", tip: "书桌或孩子书桌宜朝此方位；摆放文昌塔或四支毛笔，学业运加持。" },
    5: { name: "五黄廉贞星", luck: "大凶", theme: "灾祸、阻滞", tip: "全年最凶之星，忌动土、装修与长期逗留；可放置铜铃、五帝钱或金属摆件镇之；保持安静。" },
    6: { name: "六白武曲星", luck: "吉", theme: "偏财、贵人、权力", tip: "利事业晋升与偏财；摆放金属摆件或黄水晶；忌杂乱，宜整洁开阔。" },
    7: { name: "七赤破军星", luck: "凶", theme: "破财、口舌、盗贼", tip: "注意财物安全，勿在此方位放锋利物品；可放水养植物或蓝色饰品化解。" },
    8: { name: "八白左辅星", luck: "大吉", theme: "正财、事业、置业", tip: "年度最强财星！财位宜明亮、干净、通风；可摆放貔貅、聚宝盆或绿植催旺财运。" },
    9: { name: "九紫右弼星", luck: "吉", theme: "喜庆、婚姻、人缘", tip: "主喜事临门，利婚恋与贵人；可摆放红色饰品或鲜花，催旺喜庆之气。" }
  };
  // 流年九宫飞星（年紫白）：下元 1984 七赤入中、逐年退一、顺飞（1984–2043 适用）
  function feixingOfYear(year) {
    if (year < 1984 || year > 2043) return null;
    var center = ((7 - (year - 1984)) % 9 + 9) % 9;
    if (center === 0) center = 9;
    var order = ["center", "northwest", "west", "northeast", "south", "north", "southwest", "east", "southeast"];
    var pos = { year: year };
    var s = center;
    order.forEach(function (d) { pos[d] = s; s = s % 9 + 1; });
    return pos;
  }

  /* ---------- 工具 ---------- */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function chips(items, cls) {
    return (items || []).map(function (i) { return '<span class="chip ' + (cls || "") + '">' + esc(i) + "</span>"; }).join("");
  }
  function elemBadge(e) {
    return '<span class="elem-dot" style="background:' + ELEM_COLOR[e] + '"></span>' + e;
  }

  /* ---------- 状态 ---------- */
  var state = { chart: null, birth: null, sign: null };

  /* ---------- 表单 ---------- */
  var HOUR_OPTIONS = [
    { value: 0, label: "早子时 00:00–00:59" },
    { value: 1, label: "丑时 01:00–02:59" },
    { value: 3, label: "寅时 03:00–04:59" },
    { value: 5, label: "卯时 05:00–06:59" },
    { value: 7, label: "辰时 07:00–08:59" },
    { value: 9, label: "巳时 09:00–10:59" },
    { value: 11, label: "午时 11:00–12:59" },
    { value: 13, label: "未时 13:00–14:59" },
    { value: 15, label: "申时 15:00–16:59" },
    { value: 17, label: "酉时 17:00–18:59" },
    { value: 19, label: "戌时 19:00–20:59" },
    { value: 21, label: "亥时 21:00–22:59" },
    { value: 23, label: "晚子时 23:00–23:59" },
    { value: -1, label: "不确定" }
  ];

  function fillSelect(sel, options) {
    sel.innerHTML = options.map(function (o) {
      return '<option value="' + o.value + '">' + esc(o.label) + "</option>";
    }).join("");
  }

  // 初始化一组出生信息字段（groupPrefix 为字段 class 前缀，如 ""、"a-"、"b-"）
  function initBirthForm(rootSel, groupPrefix) {
    groupPrefix = groupPrefix || "";
    var root = $(rootSel);
    function q(sel) { return root.querySelector("." + groupPrefix + sel); }
    var ySel = q("f-year"), mSel = q("f-month"), dSel = q("f-day");
    var years = [];
    for (var y = 2025; y >= 1900; y--) years.push({ value: y, label: y + " 年" });
    fillSelect(ySel, years);
    fillSelect(mSel, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) { return { value: m, label: m + " 月" }; }));
    fillSelect(dSel, Array.from({ length: 31 }, function (_, i) { return { value: i + 1, label: i + 1 + " 日" }; }));
    fillSelect(q("f-hour"), HOUR_OPTIONS);
    ySel.value = 1995; mSel.value = 1; dSel.value = 1;
    q("f-hour").value = 11; // 默认午时
  }

  // 读取一组出生信息（groupPrefix 同 initBirthForm）
  function readBirthGroup(root, groupPrefix) {
    groupPrefix = groupPrefix || "";
    function q(sel) { return root.querySelector("." + groupPrefix + sel); }
    var isLunar = q("f-cal").value === "lunar";
    var y = parseInt(q("f-year").value, 10);
    var m = parseInt(q("f-month").value, 10);
    var d = parseInt(q("f-day").value, 10);
    var hour = parseInt(q("f-hour").value, 10);
    var gender = q("f-gender").value;
    var leapEl = q("f-leap");
    var isLeap = leapEl ? leapEl.checked : false;
    var hourUnknown = hour < 0;
    if (hourUnknown) hour = 11; // 时辰不详按午时推定
    if (isLunar) {
      var conv = L.lunar2solar(y, m, d, isLeap);
      if (!conv) return { error: "该农历日期不存在（可能是闰月设置有误），请检查后重试" };
    }
    if (isLunar && isLeap && L.leapMonth(y) !== m) return { error: "该农历年没有闰 " + m + " 月，请取消闰月选项" };
    return {
      birth: { year: y, month: m, day: d, hour: hour, gender: gender, isLunar: isLunar, isLeapMonth: isLeap },
      name: "",
      hourUnknown: hourUnknown
    };
  }

  function readBirthForm(rootSel) {
    var root = $(rootSel);
    var r = readBirthGroup(root, "");
    if (r.error) return r;
    var nameEl = root.querySelector(".f-name");
    r.name = nameEl ? nameEl.value.trim() : "";
    return r;
  }

  function showError(rootSel, msg) {
    var box = $(rootSel + " .form-error");
    if (box) { box.textContent = msg; box.style.display = "block"; }
  }
  function clearError(rootSel) {
    var box = $(rootSel + " .form-error");
    if (box) { box.style.display = "none"; }
  }

  /* ---------- 五行雷达图 ---------- */
  function radarSVG(scores) {
    var cx = 120, cy = 105, R = 72;
    var angles = [-90, -18, 54, 126, 198].map(function (a) { return a * Math.PI / 180; });
    function pt(i, r) {
      return (cx + r * Math.cos(angles[i])).toFixed(1) + "," + (cy + r * Math.sin(angles[i])).toFixed(1);
    }
    var grid = "";
    for (var g = 1; g <= 4; g++) {
      var pts = ELEM_ORDER.map(function (_, i) { return pt(i, R * g / 4); }).join(" ");
      grid += '<polygon points="' + pts + '" fill="none" stroke="rgba(201,163,92,.18)" stroke-width="1"/>';
    }
    var axes = ELEM_ORDER.map(function (_, i) { return '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt(i, R).split(",")[0] + '" y2="' + pt(i, R).split(",")[1] + '" stroke="rgba(201,163,92,.18)" stroke-width="1"/>'; }).join("");
    var data = ELEM_ORDER.map(function (_, i) { return pt(i, Math.max(6, scores[i] / 100 * R)); }).join(" ");
    var labels = ELEM_ORDER.map(function (e, i) {
      var p = pt(i, R + 18).split(",");
      return '<text x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" font-size="15" fill="' + ELEM_COLOR[e] + '" font-weight="bold">' + e + "</text>";
    }).join("");
    var valueTexts = ELEM_ORDER.map(function (e, i) {
      var p = pt(i, R * 0.42).split(",");
      return '<text x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" font-size="12" fill="#e8dcc0">' + scores[i] + '</text>';
    }).join("");
    return '<svg viewBox="0 0 240 210" class="radar" role="img" aria-label="五行分布图">' + grid + axes +
      '<polygon points="' + data + '" fill="rgba(201,163,92,.28)" stroke="#c9a35c" stroke-width="2"/>' +
      '<polygon points="' + data + '" fill="none" stroke="#e8dcc0" stroke-width="1" opacity=".6"/>' +
      labels + valueTexts + "</svg>";
  }

  /* ---------- 今日黄历 ---------- */
  function renderAlmanac() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    var lunar = L.solar2lunar(y, m, d);
    var dg = L.dayGanZhi(y, m, d);
    var yj = L.yiJiOfDay(y, m, d);
    var sign = Z.getSign(m, d);
    var h = $("#almanac");
    if (!h) return;
    h.innerHTML =
      '<div class="almanac-top">' +
      '  <div class="almanac-date"><span class="a-big">' + m + "月" + d + "日</span><span class=\"a-sub\">" + y + "年 · 星期" + "日一二三四五六"[now.getDay()] + "</span></div>" +
      '  <div class="almanac-ganzhi"><span class="a-pillar">' + dg.ganzhi + "日</span><span class=\"a-sub\">" + esc(lunar.monthName + lunar.dayName) + " · " + esc(lunar.yearGanZhi) + "年 · 属" + esc(lunar.zodiac) + "</span></div>" +
      '  <div class="almanac-sign">今日星座：' + esc(sign.name) + ' · 值日：<b>' + yj.god + "日</b></div>" +
      "</div>" +
      '<div class="almanac-yj"><div class="yj-col yi"><span class="yj-label">宜</span>' + chips(yj.yi) + "</div>" +
      '<div class="yj-col ji"><span class="yj-label">忌</span>' + chips(yj.ji) + "</div></div>" +
      '<div class="almanac-quote">📜 今日心语：' + esc(EM.quoteOfDay(now)) + "</div>";
  }

  /* ---------- 排盘渲染 ---------- */
  function renderChart(chart, meta) {
    var p = chart.pillars;
    var cols = ["year", "month", "day", "hour"];
    var colNames = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
    var html = "";
    // 基本信息
    html += '<div class="card chart-head">';
    html += '<div class="chart-title">' + esc(meta.name || "命主") + " · " + esc(chart.genderName) + "命 · 日主<strong>" + chart.dayMaster.gan + "</strong>" +
      '<span class="pillar-sub">' + esc(chart.dayMaster.element) + " · " + esc(chart.dayMaster.yinYang) + " · 身" + esc(chart.dayMaster.strength) + "</span></div>";
    html += '<div class="chart-meta">公历 ' + chart.solar.year + "-" + chart.solar.month + "-" + chart.solar.day +
      "（农历 " + esc(chart.lunar.monthName + chart.lunar.dayName) + "）· 属" + esc(chart.lunar.zodiac) + " · " + esc(Z.getSign(chart.solar.month, chart.solar.day).name) +
      (chart.lateZi ? " · 晚子时生（日柱按次日）" : "") +
      (meta.hourUnknown ? " · 时辰不详（按午时推定）" : "") + "</div>";
    html += "</div>";

    // 四柱表
    html += '<div class="card"><h3 class="card-title">四柱命盘</h3><div class="pillars">';
    cols.forEach(function (k) {
      var col = p[k];
      html += '<div class="pillar-col' + (k === "day" ? " day-col" : "") + '">';
      html += '<div class="pillar-name">' + colNames[k] + (k === "year" ? "（" + chart.yearPillarYear + "）" : "") + "</div>";
      html += '<div class="pillar-gan" style="color:' + ELEM_COLOR[col.ganElement] + '">' + col.gan + "</div>";
      html += '<div class="pillar-shishen">' + col.ganShiShen + "</div>";
      html += '<div class="pillar-zhi" style="color:' + ELEM_COLOR[col.zhiElement] + '">' + col.zhi + "</div>";
      html += '<div class="pillar-hidden">' + col.hidden.map(function (h) {
        return '<span class="hidden-gan" style="color:' + ELEM_COLOR[h.element] + '" title="' + esc(h.shiShen) + '">' + h.gan + "</span>";
      }).join("") + "</div>";
      html += '<div class="pillar-nayin">' + col.naiYin + "</div>";
      if (k === "year") html += '<div class="pillar-zodiac">属' + esc(col.zodiac) + "</div>";
      html += "</div>";
    });
    html += "</div>";
    html += '<p class="form-note">年柱以立春换年，日柱以 23:00（晚子时）换日，与多数排盘软件一致。</p></div>';

    // 五行分析
    html += '<div class="card grid-2"><div><h3 class="card-title">五行能量分布</h3>' + radarSVG(chart.elements) + "</div>";
    html += "<div><h3 class=\"card-title\">日主强弱与喜用神</h3>";
    html += '<div class="ys-card"><div class="ys-row"><span class="ys-label">日主</span><span>' + chart.dayMaster.gan + "（" + chart.dayMaster.element + "）· 身" + chart.dayMaster.strength + "</span></div>";
    html += '<div class="ys-row"><span class="ys-label">喜用神</span><span class="ys-value">' + elemBadge(chart.yongShen.yong) + "（补" + chart.yongShen.yong + "）</span></div>";
    html += '<div class="ys-row"><span class="ys-label">忌神</span><span>' + elemBadge(chart.yongShen.ji) + "（泄" + chart.yongShen.ji + "）</span></div>";
    chart.yongShen.notes.forEach(function (n) { html += '<div class="ys-note">' + esc(n) + "</div>"; });
    html += '<p class="form-note">喜用神采用简算法（五行平衡 + 月令旺衰），仅供娱乐参考，专业论断请咨询命理师。</p></div></div></div>';

    // 十神分布
    html += '<div class="card"><h3 class="card-title">十神分布（以日主' + chart.dayMaster.gan + "为“我”）</h3><div class=\"ss-grid\">";
    cols.forEach(function (k) {
      var col = p[k];
      html += '<div class="ss-item"><span class="ss-pos">' + colNames[k] + "·" + col.gan + "</span><span class=\"ss-name\">" + col.ganShiShen + "</span></div>";
    });
    html += "</div></div>";

    // 神煞
    if (chart.shenSha.length) {
      html += '<div class="card"><h3 class="card-title">神煞</h3><div class="ss-grid">';
      chart.shenSha.forEach(function (s) {
        html += '<div class="ss-item"><span class="ss-pos">' + esc(s.name) + "（" + esc(s.zhi) + "）</span><span class=\"ss-desc\">" + esc(s.desc) + "</span></div>";
      });
      html += "</div></div>";
    }

    // 大运
    html += '<div class="card"><h3 class="card-title">大运（' + (chart.daYun.forward ? "顺排" : "逆排") + " · " + chart.daYun.qiYunAge + "岁起运，虚岁" + chart.daYun.qiYunXu + "）</h3><div class=\"dayun-grid\">";
    chart.daYun.pillars.forEach(function (dp) {
      html += '<div class="dayun-item"><span class="dayun-ganzhi">' + dp.ganzhi + "</span><span class=\"dayun-shishen\">" + dp.ganShiShen + "</span><span class=\"dayun-age\">" + dp.startAge + "~" + dp.endAge + "岁</span></div>";
    });
    html += "</div></div>";

    // 流年
    var ln = chart.liuNian;
    html += '<div class="card"><h3 class="card-title">' + ln.year + "流年 · " + ln.ganzhi + "年（" + esc(ln.zodiac) + "年）</h3>";
    html += '<div class="liunian-rel">' + esc(ln.relation.name) + " · 流年干十神：" + ln.ganShiShen + "</div>";
    html += '<p class="liunian-text">' + esc(ln.relation.desc) + "</p>";
    html += '<p class="liunian-text">' + esc((C.FLOW[ln.relation.type] || C.FLOW["平"]).text) + "</p></div>";

    $("#chart-result").innerHTML = html;
    renderZodiacSection(chart);
    renderPersonalitySection(chart);
    renderFengshuiSection(chart);
    renderPotentialSection(chart);
  }

  /* ---------- 星座 ---------- */
  function renderZodiacSection(chart) {
    var sign = Z.getSign(chart.solar.month, chart.solar.day);
    var el = $("#zodiac-result");
    if (!el) return;
    el.innerHTML =
      '<div class="card zodiac-card">' +
      '<div class="zodiac-head"><div class="zodiac-symbol">' + esc(sign.name.slice(0, 1)) + "</div>" +
      '<div><div class="zodiac-name">' + esc(sign.name) + " <small>" + esc(sign.en) + "</small></div>" +
      '<div class="zodiac-sub">' + sign.from[0] + "." + sign.from[1] + " – " + sign.to[0] + "." + sign.to[1] + " · " + esc(Z.ELEM[sign.element]) + " · 守护星：" + esc(sign.planet) + "</div>" +
      chips(sign.keywords, "chip-gold") + "</div></div>" +
      '<div class="zodiac-body">' +
      '<div class="z-sec"><h4>性格</h4><p>' + esc(sign.personality) + "</p></div>" +
      '<div class="z-sec"><h4>爱情</h4><p>' + esc(sign.love) + "</p></div>" +
      '<div class="z-sec"><h4>事业</h4><p>' + esc(sign.career) + "</p></div>" +
      '<div class="z-sec"><h4>幸运物</h4><div class="lucky-grid">' +
      '<div class="lucky-item"><span>幸运色</span>' + esc(sign.lucky.color) + "</div>" +
      '<div class="lucky-item"><span>幸运数字</span>' + esc(sign.lucky.number) + "</div>" +
      '<div class="lucky-item"><span>幸运花</span>' + esc(sign.lucky.flower) + "</div>" +
      '<div class="lucky-item"><span>幸运石</span>' + esc(sign.lucky.stone) + "</div></div></div>" +
      '<div class="z-sec"><h4>今年运势 · ' + chart.liuNian.ganzhi + "年（属" + esc(chart.liuNian.zodiac) + "）</h4><p>" + esc(sign.year) + "</p></div>" +
      '<div class="z-sec"><h4>天赋关键词</h4><p>' + esc(sign.talent) + "</p></div>" +
      "</div></div>";
  }

  /* ---------- 性格 ---------- */
  function renderPersonalitySection(chart) {
    var el = $("#personality-result");
    if (!el) return;
    var dayGan = chart.dayMaster.gan;
    var elem = chart.dayMaster.element;
    var e = C.ELEM[elem], g = C.GAN[dayGan];
    var sign = Z.getSign(chart.solar.month, chart.solar.day);
    var shengxiao = C.ZODIAC[chart.lunar.zodiac];
    el.innerHTML =
      '<div class="card"><h3 class="card-title">五行性格 · ' + elem + "（" + e.virtue + "）</h3>" +
      "<p>" + esc(e.traits) + "</p>" +
      '<div class="two-col"><div><h4>优势</h4><ul class="tick-list">' + e.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" +
      '<div><h4>需要修炼</h4><ul class="tick-list warn">' + e.weaknesses.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div></div>" +
      '<p class="advice-line">💡 ' + esc(e.advice) + "</p></div>" +
      '<div class="card grid-2"><div><h3 class="card-title">日主 ' + dayGan + " · " + esc(g.image) + "</h3><p>" + esc(g.text) + "</p><p class=\"advice-line\">✨ " + esc(g.tip) + "</p></div>" +
      '<div><h3 class="card-title">生肖 · ' + esc(chart.lunar.zodiac) + "</h3><p>" + esc(shengxiao) + "</p>" +
      '<h3 class="card-title" style="margin-top:14px">星座 · ' + esc(sign.name) + "</h3><p>" + esc(sign.keywords.join("、")) + "——" + esc(sign.personality.slice(0, 60)) + "……</p></div></div>";
  }

  /* ---------- 风水 ---------- */
  function renderFengshuiSection(chart) {
    var el = $("#fengshui-result");
    if (!el) return;
    var yong = chart.yongShen.yong, ji = chart.yongShen.ji;
    var f = C.FENGSHU[yong];
    var jf = C.FENGSHU[ji];
    el.innerHTML =
      '<div class="card"><h3 class="card-title">个人风水 · 以喜用神「' + yong + "」为纲</h3>" +
      '<div class="fs-grid">' +
      '<div class="fs-item"><span>吉利方位</span>' + chips(f.directions, "chip-gold") + "</div>" +
      '<div class="fs-item"><span>幸运颜色</span>' + chips(f.colors, "chip-gold") + "</div>" +
      '<div class="fs-item"><span>幸运数字</span>' + chips(f.numbers, "chip-gold") + "</div>" +
      '<div class="fs-item"><span>旺运行业</span>' + chips(f.industries, "chip-gold") + "</div>" +
      '<div class="fs-item"><span>助运水晶</span>' + chips(f.crystals, "chip-gold") + "</div>" +
      '<div class="fs-item"><span>旺宅植物</span>' + chips(f.plants, "chip-gold") + "</div>" +
      "</div>" +
      '<div class="fs-advice"><h4>家居布局</h4><p>' + esc(f.layout) + "</p></div>" +
      '<div class="fs-advice"><h4>日常穿戴</h4><p>' + esc(f.wear) + "</p></div>" +
      '<div class="fs-advice warn"><h4>注意事项</h4><p>' + esc(jf.avoid) + "</p></div>" +
      "</div>" +
      renderFeixing(chart);
  }

  function renderFeixing(chart) {
    var pos = feixingOfYear(chart.liuNian.year);
    if (!pos) return "";
    var dirs = [
      ["southeast", "东南"], ["south", "正南"], ["southwest", "西南"],
      ["east", "正东"], ["center", "中宫"], ["west", "正西"],
      ["northeast", "东北"], ["north", "正北"], ["northwest", "西北"]
    ];
    var html = '<div class="card"><h3 class="card-title">' + pos.year + " 流年九宫飞星图（立春后生效）</h3><div class=\"feixing-wrap\">";
    html += '<div class="feixing-grid">';
    dirs.forEach(function (d) {
      var star = STAR_INFO[pos[d[0]]];
      if (!star) return;
      var bad = star.luck.indexOf("凶") >= 0;
      html += '<div class="feixing-cell ' + (bad ? "fx-bad" : "fx-good") + (d[0] === "center" ? " fx-center" : "") + '">' +
        '<div class="fx-dir">' + d[1] + "</div>" +
        '<div class="fx-star">' + star.name + "</div>" +
        '<div class="fx-theme">' + star.theme + "</div>" +
        '<div class="fx-tip">' + star.tip + "</div>" +
        "</div>";
    });
    html += "</div><p class=\"form-note\">九宫飞星为传统风水流年布局参考，方位以住宅/办公场所中心为准，仅供娱乐。</p></div></div>";
    return html;
  }

  /* ---------- 潜力 ---------- */
  function renderPotentialSection(chart) {
    var el = $("#potential-result");
    if (!el) return;
    var elem = chart.dayMaster.element;
    var pot = C.POTENTIAL[elem];
    var sign = Z.getSign(chart.solar.month, chart.solar.day);
    var starTalent = C.STAR_TALENT[sign.element];
    var ln = chart.liuNian;
    var flow = C.FLOW[ln.relation.type] || C.FLOW["平"];
    el.innerHTML =
      '<div class="card"><h3 class="card-title">天赋解码 · ' + elem + "行 × " + esc(sign.name) + "</h3>" +
      '<div class="two-col"><div><h4>你的核心天赋</h4><ul class="tick-list">' +
      ["<li>" + esc(pot.talent) + "（五行天赋）</li>", "<li>" + esc(sign.talent) + "（星座天赋）</li>", "<li>" + esc(starTalent.join("、")) + "（星座元素天赋）</li>", "<li>" + esc(C.GAN[chart.dayMaster.gan].image) + "之性（日主特质）</li>"].join("") +
      "</ul></div>" +
      '<div><h4>天赋职业方向</h4><p>' + esc(pot.careers) + "</p>" +
      "<h4>同元素旺运行业</h4><p>" + esc(C.ELEM[elem].career) + "</p></div></div>" +
      '<h4 style="margin-top:14px">成长小习惯（' + elem + "行修炼）</h4><ul class=\"tick-list\">" +
      pot.habits.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" +
      '<p class="motto">「' + esc(pot.motto) + "」</p></div>" +
      '<div class="card"><h3 class="card-title">' + ln.year + " 流年指引 · " + esc(flow.title) + "</h3>" +
      "<p>" + esc(flow.text) + "</p>" +
      '<p class="advice-line">流年关系：' + esc(ln.relation.name) + "（" + esc(ln.relation.desc) + "）</p></div>";
  }

  /* ---------- 姻缘配对 ---------- */
  function initLoveForm() {
    initBirthForm("#love-form", "a-");
    initBirthForm("#love-form", "b-");
  }
  function renderLove() {
    var root = $("#love-form");
    var fa = readBirthGroup(root, "a-");
    var fb = readBirthGroup(root, "b-");
    if (fa.error || fb.error) {
      showError("#love-form", (fa.error ? "甲方：" : "乙方：") + (fa.error || fb.error));
      return;
    }
    clearError("#love-form");
    var ca = B.buildChart(fa.birth), cb = B.buildChart(fb.birth);
    if (!ca || !cb) { showError("#love-form", "出生日期超出可计算范围（1900–2100）"); return; }
    var signA = Z.getSign(ca.solar.month, ca.solar.day);
    var signB = Z.getSign(cb.solar.month, cb.solar.day);
    var res = CM.analyze(ca, cb, signA, signB);
    var html =
      '<div class="card love-result"><div class="love-score-wrap">' +
      '<div class="love-score" style="--score:' + res.total + '">' +
      '<span class="love-score-num">' + res.total + "</span><span class=\"love-score-label\">综合匹配度</span></div>" +
      '<div class="love-level"><span class="love-level-name">' + esc(res.level) + "</span><p>" + esc(res.summary) + "</p></div></div>" +
      '<div class="love-breakdown">' +
      '<div class="lb-item"><div class="lb-head"><span>八字五行</span><b>' + res.bazi.score + "分</b></div><div class=\"lb-bar\"><i style=\"width:" + res.bazi.score + "%\"></i></div><p>" + esc(res.bazi.text) + "</p></div>" +
      '<div class="lb-item"><div class="lb-head"><span>星座配对</span><b>' + res.zodiac.score + "分</b></div><div class=\"lb-bar\"><i style=\"width:" + res.zodiac.score + "%\"></i></div><p>" + esc(res.zodiac.text) + "</p></div>" +
      '<div class="lb-item"><div class="lb-head"><span>生肖关系</span><b>' + res.shengxiao.score + "分</b></div><div class=\"lb-bar\"><i style=\"width:" + res.shengxiao.score + "%\"></i></div><p>" + esc(res.shengxiao.text) + "</p></div>" +
      "</div>" +
      '<div class="love-advice"><h4>相处锦囊</h4><ul class="tick-list">' +
      res.advice.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") +
      "</ul></div></div>";
    $("#love-result").innerHTML = html;
    $("#love-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- 情绪调节 ---------- */
  function renderEmotionPicker() {
    var wrap = $("#emotion-picker");
    if (!wrap) return;
    wrap.innerHTML = EM.KEYS.map(function (k) {
      return '<button class="emotion-btn" data-emotion="' + k + '">' + k + "</button>";
    }).join("");
    wrap.querySelectorAll(".emotion-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { renderEmotionPlan(btn.dataset.emotion); });
    });
  }
  function renderEmotionPlan(key) {
    var plan = EM.getPlan(key);
    if (!plan) return;
    var t = plan.breath.timing;
    $("#emotion-plan").innerHTML =
      '<div class="card emotion-plan"><h3 class="card-title">' + esc(plan.label) + " · 调节方案</h3>" +
      '<div class="em-sec"><h4>🧘 情志相胜</h4><p>' + esc(plan.sheng) + "</p></div>" +
      '<div class="em-sec"><h4>🎵 五音疗愈</h4><p>' + esc(plan.music) + "</p></div>" +
      '<div class="em-sec"><h4>🌬 呼吸引导 · ' + esc(plan.breath.name) + "</h4>" +
      '<p>' + esc(plan.breath.steps) + "</p>" +
      '<div class="breath-box"><div class="breath-circle" id="breath-circle"></div><div class="breath-text" id="breath-text">准备</div>' +
      '<button class="btn btn-gold" id="breath-start">开始呼吸练习</button></div></div>' +
      '<div class="em-sec"><h4>🖐 穴位安抚</h4><p>' + esc(plan.acupoint) + "</p></div>" +
      '<div class="em-sec"><h4>🍵 本草茶饮</h4><p>' + esc(plan.tea) + "</p></div>" +
      '<div class="em-sec"><h4>💬 肯定语</h4><p class="affirm">“' + esc(plan.affirm) + "”</p></div>" +
      '<div class="em-sec"><h4>🎨 环境调频</h4><p>' + esc(plan.color) + "</p></div>" +
      '<p class="form-note">以上内容源自传统情志养生与中医五音疗法整理，仅为日常放松参考，不构成医疗建议；穴位按揉力度宜轻柔，孕妇及特殊人群请遵医嘱。</p>' +
      "</div>";
    var running = false, timer = null;
    $("#breath-start").addEventListener("click", function () {
      if (running) { stopBreath(); return; }
      startBreath(t);
    });
    function startBreath(timing) {
      running = true;
      var btn = $("#breath-start");
      btn.textContent = "停止练习";
      var circle = $("#breath-circle"), text = $("#breath-text");
      var phases = [
        { label: "吸气", dur: timing.inhale, scale: 1.4 },
        { label: "屏息", dur: timing.hold, scale: 1.4 },
        { label: "呼气", dur: timing.exhale, scale: 1 },
        { label: "屏息", dur: timing.hold2, scale: 1 }
      ].filter(function (p) { return p.dur > 0; });
      var idx = 0;
      function step() {
        if (!running) return;
        var ph = phases[idx % phases.length];
        text.textContent = ph.label;
        circle.style.transitionDuration = ph.dur + "s";
        circle.style.transform = "scale(" + ph.scale + ")";
        idx++;
        timer = setTimeout(step, ph.dur * 1000);
      }
      circle.style.transform = "scale(1)";
      text.textContent = "准备";
      setTimeout(step, 600);
    }
    function stopBreath() {
      running = false;
      clearTimeout(timer);
      var btn = $("#breath-start");
      if (btn) btn.textContent = "开始呼吸练习";
      var circle = $("#breath-circle");
      if (circle) circle.style.transform = "scale(1)";
      var text = $("#breath-text");
      if (text) text.textContent = "准备";
    }
  }

  /* ---------- 主排盘流程 ---------- */
  function runChart() {
    var f = readBirthForm("#chart-form");
    if (f.error) { showError("#chart-form", f.error); return; }
    clearError("#chart-form");
    var chart = B.buildChart(f.birth);
    if (!chart) { showError("#chart-form", "出生日期超出可计算范围（1900–2100）"); return; }
    state.chart = chart; state.birth = f.birth; state.sign = Z.getSign(chart.solar.month, chart.solar.day);
    renderChart(chart, { name: f.name, hourUnknown: f.hourUnknown });
    $("#chart-result").scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll("[data-goto]").forEach(function (a) { a.setAttribute("href", "#sec-chart"); });
  }

  function toggleCalendarMode() {
    var root = $("#chart-form");
    var isLunar = root.querySelector(".f-cal").value === "lunar";
    root.querySelectorAll(".cal-solar-hint").forEach(function (h) { h.style.display = isLunar ? "none" : ""; });
    root.querySelectorAll(".cal-lunar-hint").forEach(function (h) { h.style.display = isLunar ? "" : "none"; });
    var leapBox = root.querySelector(".leap-wrap");
    if (leapBox) leapBox.style.display = isLunar ? "" : "none";
  }

  /* ---------- 导航高亮 ---------- */
  function initNav() {
    var links = document.querySelectorAll(".nav-link");
    var secs = [];
    links.forEach(function (a) {
      var target = a.getAttribute("href");
      if (target && target.charAt(0) === "#") {
        var sec = document.querySelector(target);
        if (sec) secs.push({ a: a, sec: sec });
      }
    });
    function onScroll() {
      var y = window.scrollY + 120;
      var current = null;
      secs.forEach(function (s) { if (s.sec.offsetTop <= y) current = s; });
      secs.forEach(function (s) { s.a.classList.toggle("active", s === current); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 初始化 ---------- */
  function init() {
    initBirthForm("#chart-form");
    initLoveForm();
    renderAlmanac();
    renderEmotionPicker();

    $("#chart-form").querySelector(".f-cal").addEventListener("change", toggleCalendarMode);
    $("#chart-form").querySelector(".f-year").addEventListener("change", function () {
      // 农历模式下提示当年闰月
      var isLunar = $("#chart-form").querySelector(".f-cal").value === "lunar";
      var y = parseInt($("#chart-form").querySelector(".f-year").value, 10);
      var leapHint = $("#chart-form").querySelector(".leap-hint");
      if (isLunar && leapHint) {
        var lm = L.leapMonth(y);
        leapHint.textContent = lm ? "（" + y + "年闰" + L.LUNAR_MONTH_NAMES[lm - 1] + "月）" : "（" + y + "年无闰月）";
      }
    });
    $("#chart-form").addEventListener("submit", function (e) { e.preventDefault(); runChart(); });
    $("#love-form").addEventListener("submit", function (e) { e.preventDefault(); renderLove(); });
    initNav();
  }

  return {
    init: init,
    STAR_INFO: STAR_INFO
  };
})();

document.addEventListener("DOMContentLoaded", function () { DSH.App.init(); });
