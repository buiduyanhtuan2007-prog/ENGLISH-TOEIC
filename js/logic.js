/* Logic thuần, không đụng đến giao diện nên test được bằng node (tests/logic.test.js). */
(function (root) {
  var TN = (root.TN = root.TN || {});

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Che từ cần học trong câu ví dụ, nhận cả dạng chia (postponed, attached, ...). */
  function cloze(word, example) {
    if (!example) return null;
    var w = esc(word.toLowerCase()), base = w.replace(/e$/, "");
    var m = new RegExp("\\b(?:" + w + "(?:s|es|d|ed|ing)?|" + base + "ing)\\b", "i").exec(example);
    if (!m) return null;
    return { text: example.slice(0, m.index) + "______" + example.slice(m.index + m[0].length), surface: m[0] };
  }

  /* Chọn kiểu bài cho một thẻ. Chế độ "auto" khó dần theo số lần nhớ liên tiếp (reps). */
  function kindFor(mode, card, hasCloze) {
    if (mode === "flip" || mode === "mc" || mode === "type") return mode;
    if (mode === "cloze") return hasCloze ? "cloze" : "mc";
    if (!card) return "flip";
    if (card.reps < 2) return "mc";
    if (card.reps < 4) return hasCloze ? "cloze" : "mc";
    return "type";
  }

  function dayKey(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function dayNum(key) {
    var p = key.split("-");
    return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }

  function complete(a, n) { return Array.isArray(a) && a.length >= n && a.slice(0, n).every(Boolean); }

  /* Chuỗi ngày: một ngày chỉ tính khi hoàn thành đủ n nhiệm vụ.
     Hôm nay chưa đủ thì chuỗi vẫn tính đến hôm qua và báo atRisk. */
  function streakStats(checks, todayKey, n) {
    var t = dayNum(todayKey), set = {};
    Object.keys(checks).forEach(function (k) { if (complete(checks[k], n)) set[dayNum(k)] = true; });
    var doneToday = !!set[t], cur = 0, d = doneToday ? t : t - 1;
    while (set[d]) { cur++; d--; }
    var best = 0, run = 0, prev = null;
    Object.keys(set).map(Number).sort(function (a, b) { return a - b; }).forEach(function (x) {
      run = prev !== null && x === prev + 1 ? run + 1 : 1;
      if (run > best) best = run;
      prev = x;
    });
    var a = checks[todayKey];
    var cnt = Array.isArray(a) ? a.slice(0, n).filter(Boolean).length : 0;
    return { current: cur, best: best, doneToday: doneToday, doneCount: cnt, atRisk: !doneToday && cur > 0 };
  }

  TN.logic = { cloze: cloze, kindFor: kindFor, dayKey: dayKey, streakStats: streakStats };
  if (typeof module !== "undefined" && module.exports) module.exports = TN.logic;
})(typeof window !== "undefined" ? window : globalThis);
