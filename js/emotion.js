/* ============================================================
 * emotion.js — 情绪调节：方案选择、呼吸节奏数据、每日心语
 * 依赖 DSH.Content。无 DOM 依赖。
 * ============================================================ */
var DSH = DSH || {};
if (typeof require === "function" && typeof module !== "undefined" && module.exports) {
  DSH.Content = require("./content.js");
}

DSH.Emotion = (function () {
  "use strict";

  var C = DSH.Content;

  // 每种情绪的呼吸引导节奏（秒）
  var TIMING = {
    "怒":   { inhale: 4, hold: 7, exhale: 8, hold2: 0 },
    "喜":   { inhale: 4, hold: 7, exhale: 8, hold2: 0 },
    "思":   { inhale: 4, hold: 4, exhale: 4, hold2: 4 },
    "悲":   { inhale: 6, hold: 0, exhale: 6, hold2: 0 },
    "恐":   { inhale: 5, hold: 0, exhale: 5, hold2: 0 },
    "焦虑": { inhale: 4, hold: 4, exhale: 4, hold2: 4 },
    "低落": { inhale: 5, hold: 2, exhale: 7, hold2: 0 }
  };

  var KEYS = ["怒", "喜", "思", "悲", "恐", "焦虑", "低落"];

  function getPlan(key) {
    var plan = C.EMOTION[key];
    if (!plan) return null;
    return {
      key: key,
      label: plan.label,
      sheng: plan.sheng,
      music: plan.music,
      breath: { name: plan.breath.name, steps: plan.breath.steps, timing: TIMING[key] || { inhale: 4, hold: 0, exhale: 6, hold2: 0 } },
      acupoint: plan.acupoint,
      tea: plan.tea,
      affirm: plan.affirm,
      color: plan.color
    };
  }

  // 每日心语：按日期取固定一条（当天稳定不变）
  function quoteOfDay(date) {
    var d = date || new Date();
    var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return C.QUOTES[seed % C.QUOTES.length];
  }

  function randomQuote() {
    return C.QUOTES[Math.floor(Math.random() * C.QUOTES.length)];
  }

  return { KEYS: KEYS, getPlan: getPlan, quoteOfDay: quoteOfDay, randomQuote: randomQuote };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DSH.Emotion;
}
