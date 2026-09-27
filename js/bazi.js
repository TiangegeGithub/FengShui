/* ============================================================
 * bazi.js — 四柱八字排盘：年/月/日/时柱、五行、十神、藏干、
 *           纳音、神煞、喜用神（简化取用法）、大运、流年
 * 依赖 DSH.Lunar。挂载到 DSH.Bazi，无 DOM 依赖。
 * 约定：年柱以立春换年，日柱以 23:00（晚子时）换日。
 * ============================================================ */
var DSH = DSH || {};
if (typeof require === "function" && typeof module !== "undefined" && module.exports) {
  DSH.Lunar = require("./lunar.js");
}

DSH.Bazi = (function () {
  "use strict";

  var L = DSH.Lunar;
  var GAN = L.GAN, ZHI = L.ZHI;

  var ELEMENTS = ["木", "火", "土", "金", "水"]; // 0木 1火 2土 3金 4水
  var GAN_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];           // 甲乙木 丙丁火 戊己土 庚辛金 壬癸水
  var GAN_YINYANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];           // 1=阳 0=阴
  var ZHI_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];     // 子水丑土寅木卯木辰土巳火午火未土申金酉金戌土亥水
  var ZHI_HIDDEN = [
    [0],        // 子: 癸
    [2, 4, 3],  // 丑: 己癸辛
    [0, 1, 2],  // 寅: 甲丙戊
    [1],        // 卯: 乙
    [2, 1, 4],  // 辰: 戊乙癸
    [1, 3, 2],  // 巳: 丙庚戊
    [1, 2],     // 午: 丁己
    [2, 1, 0],  // 未: 己丁乙
    [3, 4, 2],  // 申: 庚壬戊
    [3],        // 酉: 辛
    [2, 3, 1],  // 戌: 戊辛丁
    [4, 0]      // 亥: 壬甲
  ];
  var HIDDEN_WEIGHT = [0.5, 0.3, 0.2];

  // 纳音（60 甲子按对分组）
  var NAYIN = ["海中金","炉中火","大林木","路旁土","剑锋金","山头火","涧下水","城头土","白蜡金","杨柳木",
               "泉中水","屋上土","霹雳火","松柏木","长流水","沙中金","山下火","平地木","壁上土","金箔金",
               "覆灯火","天河水","大驿土","钗钏金","桑柘木","大溪水","沙中土","天上火","石榴木","大海水"];

  // 十神
  var SHISHEN_NAMES = { bi: "比肩", jie: "劫财", shi: "食神", shang: "伤官", piancai: "偏财", zhengcai: "正财", qisha: "七杀", zhengguan: "正官", pianyin: "偏印", zhengyin: "正印" };

  // 神煞表
  var SHEN_SHA = {
    tianyi: { name: "天乙贵人", desc: "逢凶化吉、贵人相助之吉神", lookup: { 0: [1, 7], 1: [0, 8], 2: [11, 9], 3: [11, 9], 4: [1, 7], 5: [0, 8], 6: [1, 7], 7: [2, 6], 8: [3, 5], 9: [3, 5] } },
    // 天乙: 甲戊庚→丑未；乙己→子申；丙丁→亥酉；辛→寅午；壬癸→卯巳
    taohua: { name: "桃花", desc: "人缘魅力之星，主情感缘分", lookup: { 0: [9], 4: [9], 8: [9], 2: [3], 6: [3], 10: [3], 5: [6], 9: [6], 1: [6], 11: [0], 3: [0], 7: [0] } },
    // 桃花: 申子辰→酉；寅午戌→卯；巳酉丑→午；亥卯未→子
    yima: { name: "驿马", desc: "奔波变动之星，主动中求财", lookup: { 0: [2], 4: [2], 8: [2], 2: [8], 6: [8], 10: [8], 5: [11], 9: [11], 1: [11], 11: [5], 3: [5], 7: [5] } },
    // 驿马: 申子辰→寅；寅午戌→申；巳酉丑→亥；亥卯未→巳
    huagai: { name: "华盖", desc: "聪明孤高之星，主艺术与修行", lookup: { 0: [4], 4: [4], 8: [4], 2: [10], 6: [10], 10: [10], 5: [1], 9: [1], 1: [1], 11: [7], 3: [7], 7: [7] } }
    // 华盖: 申子辰→辰；寅午戌→戌；巳酉丑→丑；亥卯未→未
  };

  // 生肖六合、三合、六冲、六害、六破、相刑
  var LIUHE = { 0: 1, 1: 0, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2 }; // 子丑 寅亥 卯戌 辰酉 巳申 午未
  var SANHE = [[0, 4, 8], [2, 6, 10], [5, 9, 1], [3, 7, 11]]; // 申子辰 寅午戌 巳酉丑 亥卯未
  var LIUCHONG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };
  var LIUHAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 }; // 子未 丑午 寅巳 卯辰 申亥 酉戌
  var LIUPO = { 0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2, 3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7 }; // 子酉 丑辰 寅亥 卯午 巳申 未戌
  var XING = { 2: [5, 8], 5: [2, 8], 8: [2, 5], 1: [10, 7], 10: [1, 7], 7: [1, 10], 0: [3], 3: [0] }; // 寅巳申 丑戌未 子卯

  /* ---------- 干支解析 ---------- */
  function pillarInfo(ganIndex, zhiIndex, dayGanIndex) {
    var hidden = ZHI_HIDDEN[zhiIndex].map(function (g, i) {
      return { gan: GAN[g], element: ELEMENTS[GAN_ELEMENT[g]], weight: HIDDEN_WEIGHT[i], shiShen: shiShen(dayGanIndex, g) };
    });
    return {
      gan: GAN[ganIndex], zhi: ZHI[zhiIndex],
      ganzhi: GAN[ganIndex] + ZHI[zhiIndex],
      ganIndex: ganIndex, zhiIndex: zhiIndex,
      ganElement: ELEMENTS[GAN_ELEMENT[ganIndex]],
      zhiElement: ELEMENTS[ZHI_ELEMENT[zhiIndex]],
      ganYinYang: GAN_YINYANG[ganIndex] ? "阳" : "阴",
      ganShiShen: shiShen(dayGanIndex, ganIndex),
      naiYin: NAYIN[Math.floor((ganIndex * 6 - zhiIndex * 5 + 60) % 60 / 2)],
      hidden: hidden,
      zodiac: L.ZODIAC[zhiIndex]
    };
  }

  // 十神：以日干为“我”，otherGanIndex 为其他天干
  function shiShen(dayGanIndex, otherGanIndex) {
    var me = GAN_ELEMENT[dayGanIndex], other = GAN_ELEMENT[otherGanIndex];
    var samePolarity = GAN_YINYANG[dayGanIndex] === GAN_YINYANG[otherGanIndex];
    if (me === other) return samePolarity ? "比肩" : "劫财";          // 同我
    if (sheng(me) === other) return samePolarity ? "食神" : "伤官";   // 我生
    if (ke(me) === other) return samePolarity ? "偏财" : "正财";      // 我克
    if (ke(other) === me) return samePolarity ? "七杀" : "正官";      // 克我
    return samePolarity ? "偏印" : "正印";                             // 生我
  }
  // 注意：五行关系判定用 生/克 环
  function sheng(a) { return (a + 1) % 5; }   // 木生火生土生金生水生木
  function ke(a) { return (a + 2) % 5; }      // 木克土克水克火克金克木

  // 校验十神逻辑：
  // 我生: 我 → sheng(me) = other  ✓
  // 克我: other → sheng(other) = me 即 ke(me) === other  ✓
  // 我克: me → sheng(me) 之后? 不：我克 = ke(me) === other? 上面用了 sheng(other)===me 等价于 ke(me)===other ✓（ke 是 sheng 的逆）
  // 生我: sheng(other) === me 即 other = 前一位 = (me+4)%5 ✓ 用 ke(me)===other 表示克我，那么生我 = sheng(other)===me。

  /* ---------- 月柱（五虎遁） ---------- */
  var YUE_GAN_START = { 0: 2, 1: 4, 2: 6, 3: 8, 4: 0 }; // 年干%5 → 寅月天干
  function monthPillar(yearPillarYear, y, m, d) {
    var terms = L.sTermsOfYear(y);
    var lichun = terms[2], xiaohan = terms[0];
    var monthZhiIndex;
    if (cmpDate(y, m, d, lichun.year, lichun.month, lichun.day) >= 0) {
      var prev = -1, map = { 2: 2, 4: 3, 6: 4, 8: 5, 10: 6, 12: 7, 14: 8, 16: 9, 18: 10, 20: 11, 22: 0 };
      for (var n = 2; n <= 22; n += 2) {
        var t = terms[n];
        if (cmpDate(y, m, d, t.year, t.month, t.day) >= 0) prev = n;
      }
      monthZhiIndex = map[prev];
    } else {
      monthZhiIndex = cmpDate(y, m, d, xiaohan.year, xiaohan.month, xiaohan.day) >= 0 ? 1 : 0;
    }
    var yearGan = (yearPillarYear - 4) % 10;
    var start = YUE_GAN_START[yearGan % 5];
    var offset = ((monthZhiIndex - 2) % 12 + 12) % 12;
    return { ganIndex: (start + offset) % 10, zhiIndex: monthZhiIndex };
  }

  /* ---------- 时柱（五鼠遁） ---------- */
  var SHI_GAN_START = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8 }; // 日干%5 → 子时天干
  function hourPillar(dayGanIndex, hour) {
    var shichen = L.hourToShichen(hour);
    var start = SHI_GAN_START[dayGanIndex % 5];
    return { ganIndex: (start + shichen) % 10, zhiIndex: shichen };
  }

  function cmpDate(y1, m1, d1, y2, m2, d2) {
    if (y1 !== y2) return y1 > y2 ? 1 : -1;
    if (m1 !== m2) return m1 > m2 ? 1 : -1;
    if (d1 !== d2) return d1 > d2 ? 1 : -1;
    return 0;
  }

  /* ---------- 五行计分 ---------- */
  function elementScores(pillars, monthZhiIndex) {
    var scores = [0, 0, 0, 0, 0];
    function add(el, w) { scores[el] += w; }
    [pillars.year, pillars.month, pillars.day, pillars.hour].forEach(function (p) {
      add(GAN_ELEMENT[p.ganIndex], 1);
      p.hidden.forEach(function (h, i) { add(GAN_ELEMENT[GAN.indexOf(h.gan)], HIDDEN_WEIGHT[i]); });
    });
    // 月令旺相休囚死（以月支五行为令）
    var ling = ZHI_ELEMENT[monthZhiIndex];
    var mods = [0, 0, 0, 0, 0];
    mods[ling] = 1.5;                    // 当令者旺
    mods[(ling + 4) % 5] = 1.0;          // 生令者相
    mods[(ling + 1) % 5] = 0.5;          // 令生者休
    mods[(ling + 2) % 5] = 0;            // 令克者囚
    mods[(ling + 3) % 5] = -0.5;         // 克令者死
    for (var i = 0; i < 5; i++) scores[i] += mods[i];
    // 负值（克令者"死"气过重）钳为 0 后再归一化，避免出现负百分比
    var safe = scores.map(function (s) { return s < 0 ? 0 : s; });
    var total = safe.reduce(function (a, b) { return a + b; }, 0);
    var normalized = safe.map(function (s) { return Math.round(s / total * 100); });
    return { raw: scores, norm: normalized, total: total };
  }

  /* ---------- 喜用神（简化取用法） ---------- */
  function yongShen(dayElement, scores, monthZhiIndex) {
    var avg = scores.total / 5, dm = scores.raw[dayElement];
    var strength;
    if (dm >= avg * 1.2) strength = "偏强";
    else if (dm <= avg * 0.85) strength = "偏弱";
    else strength = "中和";

    var yong = -1, ji = -1;
    if (strength === "偏强") {
      // 喜克泄耗：克我(官杀)、我克(财)、我生(食伤) 取分数最低
      var cands = [ke(dayElement), (dayElement + 2) % 5, (dayElement + 1) % 5];
      yong = cands[0];
      cands.forEach(function (c) { if (scores.raw[c] < scores.raw[yong]) yong = c; });
      var jiCands = [(dayElement + 4) % 5, dayElement];
      ji = jiCands[0];
      jiCands.forEach(function (c) { if (scores.raw[c] > scores.raw[ji]) ji = c; });
    } else if (strength === "偏弱") {
      var cands2 = [(dayElement + 4) % 5, dayElement]; // 印、比劫
      yong = cands2[0];
      cands2.forEach(function (c) { if (scores.raw[c] < scores.raw[yong]) yong = c; });
      var jiCands2 = [ke(dayElement), (dayElement + 2) % 5, (dayElement + 1) % 5];
      ji = jiCands2[0];
      jiCands2.forEach(function (c) { if (scores.raw[c] > scores.raw[ji]) ji = c; });
    } else {
      var min = 0, max = 0;
      for (var i = 1; i < 5; i++) { if (scores.raw[i] < scores.raw[min]) min = i; if (scores.raw[i] > scores.raw[max]) max = i; }
      yong = min; ji = max;
    }
    // 调候补充
    var notes = [];
    if ([11, 0, 1].indexOf(monthZhiIndex) >= 0) notes.push("生于冬月，寒气偏重，喜火调候暖局");
    if ([4, 5, 6].indexOf(monthZhiIndex) >= 0) notes.push("生于夏月，火气偏燥，喜水调候润局");
    return { strength: strength, yong: ELEMENTS[yong], ji: ELEMENTS[ji], yongIndex: yong, jiIndex: ji, notes: notes };
  }

  /* ---------- 神煞 ---------- */
  function shenSha(pillars) {
    var out = [];
    var zhis = [pillars.year.zhiIndex, pillars.month.zhiIndex, pillars.day.zhiIndex, pillars.hour.zhiIndex];
    var dayGan = pillars.day.ganIndex, yearGan = pillars.year.ganIndex;
    var seen = {};
    function find(name, key) {
      var cfg = SHEN_SHA[name];
      var targets = cfg.lookup[key] || [];
      targets.forEach(function (z) {
        if (zhis.indexOf(z) >= 0 && !seen[name + z]) {
          seen[name + z] = true;
          out.push({ name: cfg.name, desc: cfg.desc, zhi: ZHI[z] });
        }
      });
    }
    find("tianyi", dayGan); find("tianyi", yearGan);
    find("taohua", pillars.day.zhiIndex); find("taohua", pillars.year.zhiIndex);
    find("yima", pillars.day.zhiIndex); find("yima", pillars.year.zhiIndex);
    find("huagai", pillars.day.zhiIndex); find("huagai", pillars.year.zhiIndex);
    return out;
  }

  /* ---------- 大运 ---------- */
  function daYun(birth, monthP, yearPillarYear) {
    var male = birth.gender === "male";
    var yangYear = GAN_YINYANG[(yearPillarYear - 4) % 10] === 1;
    var forward = (yangYear && male) || (!yangYear && !male);
    var birthDate = new Date(birth.year, birth.month - 1, birth.day, birth.hour || 0, birth.minute || 0);

    // 收集"节"：本年度 小寒(0)、立春(2)…大雪(22)，加上下一年小寒
    var jieDates = [];
    var terms = L.sTermsOfYear(birth.year);
    for (var n = 0; n <= 22; n += 2) jieDates.push({ n: n, dt: L.sTermDate(birth.year, n) });
    jieDates.push({ n: 0, dt: L.sTermDate(birth.year + 1, 0) });
    jieDates.sort(function (a, b) { return a.dt - b.dt; });

    var target = null;
    if (forward) {
      for (var i = 0; i < jieDates.length; i++) if (jieDates[i].dt > birthDate) { target = jieDates[i]; break; }
    } else {
      for (var j = jieDates.length - 1; j >= 0; j--) if (jieDates[j].dt < birthDate) { target = jieDates[j]; break; }
    }
    var daysTo = target ? Math.abs(target.dt - birthDate) / 86400000 : 0;
    var qiYunAge = Math.round(daysTo / 3 * 10) / 10; // 周岁（3 天 = 1 年）
    var qiYunXu = Math.floor(daysTo / 3) + 1;

    var pillars = [];
    var g = monthP.ganIndex, z = monthP.zhiIndex;
    for (var k = 0; k < 8; k++) {
      if (forward) { g = (g + 1) % 10; z = (z + 1) % 12; }
      else { g = (g + 9) % 10; z = (z + 11) % 12; }
      pillars.push({
        ganzhi: GAN[g] + ZHI[z], ganIndex: g, zhiIndex: z,
        startAge: Math.round((qiYunAge + k * 10) * 10) / 10,
        endAge: Math.round((qiYunAge + (k + 1) * 10) * 10) / 10,
        ganShiShen: shiShen(birth.dayGanIndex, g)
      });
    }
    return { forward: forward, qiYunAge: qiYunAge, qiYunXu: qiYunXu, pillars: pillars };
  }

  /* ---------- 生肖关系 ---------- */
  function zhiRelation(a, b) {
    if (a === b) return { type: "值", name: "值太岁", desc: "本命年，与流年地支相同" };
    if (LIUCHONG[a] === b) return { type: "冲", name: "冲太岁", desc: "相冲之年，变动较多，宜稳守" };
    if (LIUHAI[a] === b) return { type: "害", name: "害太岁", desc: "易生口舌是非，谨言慎行" };
    if (LIUPO[a] === b) return { type: "破", name: "破太岁", desc: "易有破耗，理财宜保守" };
    var xing = XING[a];
    if (xing && xing.indexOf(b) >= 0) return { type: "刑", name: "刑太岁", desc: "易有摩擦争执，注意情绪管理" };
    if (LIUHE[a] === b) return { type: "合", name: "六合太岁", desc: "贵人相合之年，人缘与机遇俱佳" };
    var sanhe = SANHE.some(function (s) { return s.indexOf(a) >= 0 && s.indexOf(b) >= 0; });
    if (sanhe) return { type: "三合", name: "三合太岁", desc: "得三合贵人助力，合作运旺盛" };
    return { type: "平", name: "平稳之年", desc: "与流年无特殊冲合，按部就班即可" };
  }

  /* ---------- 主排盘 ---------- */
  /**
   * birth: { year, month, day, hour, minute?, gender: 'male'|'female', isLunar?: bool }
   */
  function buildChart(birth) {
    var solar = birth;
    if (birth.isLunar) {
      var conv = L.lunar2solar(birth.year, birth.month, birth.day, !!birth.isLeapMonth);
      if (!conv) return null;
      solar = { year: conv.year, month: conv.month, day: conv.day, hour: birth.hour, minute: birth.minute, gender: birth.gender };
    }
    var y = solar.year, m = solar.month, d = solar.day, h = solar.hour || 0;

    var lunar = L.solar2lunar(y, m, d);
    if (!lunar) return null;

    // 晚子时：23 点后日柱按次日算
    var lateZi = h >= 23;
    var dayBase = new Date(Date.UTC(y, m - 1, d));
    if (lateZi) dayBase = new Date(dayBase.getTime() + 86400000);
    var dg = L.dayGanZhi(dayBase.getUTCFullYear(), dayBase.getUTCMonth() + 1, dayBase.getUTCDate());

    // 年柱：立春换年
    var lichun = L.sTerm(y, 2);
    var yearPillarYear = cmpDate(y, m, d, lichun.year, lichun.month, lichun.day) >= 0 ? y : y - 1;
    var yearGan = (yearPillarYear - 4) % 10, yearZhi = (yearPillarYear - 4) % 12;

    var mp = monthPillar(yearPillarYear, y, m, d);
    var hp = hourPillar(dg.ganIndex, h);

    var dayGanIndex = dg.ganIndex;
    var pillars = {
      year: pillarInfo(yearGan, yearZhi, dayGanIndex),
      month: pillarInfo(mp.ganIndex, mp.zhiIndex, dayGanIndex),
      day: pillarInfo(dayGanIndex, dg.zhiIndex, dayGanIndex),
      hour: pillarInfo(hp.ganIndex, hp.zhiIndex, dayGanIndex)
    };

    var scores = elementScores(pillars, mp.zhiIndex);
    var ys = yongShen(GAN_ELEMENT[dayGanIndex], scores, mp.zhiIndex);
    var shensha = shenSha(pillars);

    var today = new Date();
    var lny = L.sTerm(today.getFullYear(), 2);
    var liuNianYear = cmpDate(today.getFullYear(), today.getMonth() + 1, today.getDate(), lny.year, lny.month, lny.day) >= 0 ? today.getFullYear() : today.getFullYear() - 1;
    var lng = (liuNianYear - 4) % 10, lnz = (liuNianYear - 4) % 12;

    var dayun = daYun(solar, mp, yearPillarYear);

    return {
      solar: solar,
      lunar: lunar,
      lateZi: lateZi,
      gender: birth.gender,
      genderName: birth.gender === "male" ? "男" : "女",
      yearPillarYear: yearPillarYear,
      pillars: pillars,
      dayMaster: {
        gan: GAN[dayGanIndex], element: ELEMENTS[GAN_ELEMENT[dayGanIndex]],
        yinYang: GAN_YINYANG[dayGanIndex] ? "阳" : "阴",
        strength: ys.strength
      },
      elements: scores.norm,
      elementRaw: scores.raw,
      yongShen: ys,
      shenSha: shensha,
      daYun: dayun,
      liuNian: {
        year: liuNianYear, gan: GAN[lng], zhi: ZHI[lnz], ganzhi: GAN[lng] + ZHI[lnz],
        zodiac: L.ZODIAC[lnz],
        relation: zhiRelation(yearZhi, lnz),
        ganShiShen: shiShen(dayGanIndex, lng)
      }
    };
  }

  /* ---------- 姻缘用：两人命盘五行互补 ---------- */
  function elementProfile(chart) {
    return {
      scores: chart.elements,
      dayElement: GAN_ELEMENT[chart.pillars.day.ganIndex],
      yong: chart.yongShen.yongIndex,
      ji: chart.yongShen.jiIndex,
      strength: chart.yongShen.strength
    };
  }

  return {
    ELEMENTS: ELEMENTS, GAN_ELEMENT: GAN_ELEMENT, ZHI_ELEMENT: ZHI_ELEMENT,
    shiShen: shiShen, sheng: sheng, ke: ke,
    buildChart: buildChart,
    zhiRelation: zhiRelation,
    elementProfile: elementProfile,
    LIUHE: LIUHE, SANHE: SANHE, LIUCHONG: LIUCHONG, LIUHAI: LIUHAI, LIUPO: LIUPO,
    NAYIN: NAYIN
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DSH.Bazi;
}
