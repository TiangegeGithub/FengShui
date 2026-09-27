/* ============================================================
 * compat.js — 姻缘配对：八字五行互补 + 生肖关系 + 星座配对
 * 综合中西命理，输出配对得分与分析建议。
 * 依赖 DSH.Bazi / DSH.Zodiac / DSH.Content。无 DOM 依赖。
 * ============================================================ */
var DSH = DSH || {};
if (typeof require === "function" && typeof module !== "undefined" && module.exports) {
  DSH.Bazi = require("./bazi.js");
  DSH.Zodiac = require("./zodiac.js");
  DSH.Content = require("./content.js");
}

DSH.Compat = (function () {
  "use strict";

  var B = DSH.Bazi, Z = DSH.Zodiac, C = DSH.Content;
  var ELEMENTS = B.ELEMENTS;

  /* ---------- 八字五行互补 ---------- */
  function baziScore(chartA, chartB) {
    var a = chartA.elements, b = chartB.elements;
    var score = 50;
    var details = [];
    for (var i = 0; i < 5; i++) {
      var d = a[i] - b[i];
      if (Math.abs(d) > 15) {
        var gain = Math.min(a[i], b[i]) * 0.22;
        score += gain;
        details.push({ element: ELEMENTS[i], gain: gain, diff: d });
      }
    }
    // 喜用神互济：一方的日主五行正好是另一方的喜用神
    var aDay = B.GAN_ELEMENT[chartA.pillars.day.ganIndex];
    var bDay = B.GAN_ELEMENT[chartB.pillars.day.ganIndex];
    if (bDay === chartA.yongShen.yongIndex) { score += 8; details.push({ note: "TA 的日主五行正是你的喜用神，天然补你之需" }); }
    if (aDay === chartB.yongShen.yongIndex) { score += 8; details.push({ note: "你的日主五行正是 TA 的喜用神，天然补 TA 之需" }); }
    if (chartA.yongShen.yongIndex === chartB.yongShen.yongIndex) { score += 4; details.push({ note: "你们的喜用神相同，同气相求、目标一致" }); }
    // 日主相生相克
    if (B.sheng(aDay) === bDay || B.sheng(bDay) === aDay) { score += 6; details.push({ note: "日主五行相生，彼此滋养" }); }
    if (B.ke(aDay) === bDay || B.ke(bDay) === aDay) { score -= 6; details.push({ note: "日主五行相克，相处需要更多包容（克亦是约束与成就）" }); }

    score = Math.max(35, Math.min(95, Math.round(score)));
    var level, text;
    if (score >= 80) { level = "五行相济"; text = "你们的八字五行互补性很强，一方的优势恰好补足另一方的缺口，是彼此成就的格局。"; }
    else if (score >= 68) { level = "五行相谐"; text = "五行搭配和谐，虽有差异但能互相平衡，感情基础较为稳固。"; }
    else if (score >= 55) { level = "五行相济有间"; text = "五行互有补益也有重叠，需要更多沟通来磨合生活习惯与思维差异。"; }
    else { level = "五行相待调和"; text = "五行结构差异较大，吸引力强但摩擦也多。若能互相体谅、扬长避短，反而能碰撞出精彩的火花。"; }
    return { score: score, level: level, text: text, details: details };
  }

  /* ---------- 生肖关系 ---------- */
  function shengxiaoScore(zhiA, zhiB) {
    var rel = B.zhiRelation(zhiA, zhiB);
    var score = 75;
    switch (rel.type) {
      case "合": score += 15; break;
      case "三合": score += 10; break;
      case "平": score += 5; break;
      case "值": score += 0; break;
      case "刑": score -= 8; break;
      case "害": score -= 8; break;
      case "破": score -= 6; break;
      case "冲": score -= 15; break;
    }
    score = Math.max(40, Math.min(99, score));
    var text;
    switch (rel.type) {
      case "合": text = "生肖六合，传统婚配中上上之选，彼此是对方的贵人。"; break;
      case "三合": text = "生肖三合，志趣相投、相处融洽，是公认的合婚良配。"; break;
      case "平": text = "生肖无特殊冲合，相处全看经营，平平淡淡也是真。"; break;
      case "值": text = "同属相相伴，心有灵犀但也有相似的固执，需要互相提醒。"; break;
      case "刑": text = "生肖相刑，易因小事起摩擦，学会'翻篇'是相处之道。"; break;
      case "害": text = "生肖相害，易有误会口舌，坦诚沟通是化解的钥匙。"; break;
      case "破": text = "生肖相破，小事上易有分歧损耗，约定好财务与家务分工可化解。"; break;
      case "冲": text = "生肖相冲，性格反差大、吸引力也强，聚少离多反而更甜蜜。"; break;
    }
    return { score: score, text: text, rel: rel };
  }

  /* ---------- 综合配对 ---------- */
  function analyze(chartA, chartB, signA, signB) {
    var bz = baziScore(chartA, chartB);
    var sx = shengxiaoScore(chartA.pillars.year.zhiIndex, chartB.pillars.year.zhiIndex);
    var zx = Z.match(signA, signB);

    var total = Math.round(bz.score * 0.45 + zx.score * 0.35 + sx.score * 0.2);
    var level, summary;
    if (total >= 85) { level = "天作之合"; summary = "中西合璧的顶级良配：五行相济、生肖相合、星座同频，遇见彼此是彼此的运气。好好珍惜，共赴山海。"; }
    else if (total >= 75) { level = "上等姻缘"; summary = "整体匹配度很高：虽有小差异，但大方向一致，只要保持沟通，感情会越来越深厚。"; }
    else if (total >= 65) { level = "良好良缘"; summary = "有一定互补也有需要磨合之处。感情如养花，用心浇灌便能盛开。多制造共同回忆，让默契生长。"; }
    else if (total >= 55) { level = "用心经营之缘"; summary = "你们差异明显，但差异本身也是吸引力的来源。确立共同目标、尊重彼此边界，感情会稳步升温。"; }
    else { level = "考验相伴之缘"; summary = "这段关系需要更多的智慧与耐心。给彼此空间，把冲突当作了解对方的窗口，真爱经得起打磨。"; }

    var advice = [];
    // 五行建议
    if (bz.score >= 68) advice.push("【五行】" + bz.text);
    else advice.push("【五行】" + bz.text + " 建议：定下'吵架不过夜'的约定，把相克化为互补。");
    // 生肖建议
    advice.push("【生肖】" + sx.text);
    // 星座建议
    advice.push("【星座】" + zx.tips[0] + "。" + zx.text);

    return {
      total: total, level: level, summary: summary,
      bazi: bz, shengxiao: sx, zodiac: zx,
      advice: advice
    };
  }

  return { analyze: analyze, baziScore: baziScore, shengxiaoScore: shengxiaoScore };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DSH.Compat;
}
