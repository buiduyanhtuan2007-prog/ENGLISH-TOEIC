/* Logic thuần, không đụng đến giao diện nên test được bằng node (tests/logic.test.js). */
(function (root) {
  var TN = (root.TN = root.TN || {});
  var LEECH = 4;      // quên thật từ 4 lần trở lên thì là "từ khó"
  var KNOWN = 21;     // độ bền từ 21 ngày trở lên thì coi là đã thuộc
  var LESSON = 25;    // số từ mỗi bài của bộ TOEIC

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Che từ cần học trong câu ví dụ, nhận cả dạng chia: postponed, attached, companies (y -> ies), stopped (gấp đôi phụ âm). */
  function cloze(word, example) {
    if (!example) return null;
    var lw = word.toLowerCase(), w = esc(lw), base = esc(lw.replace(/e$/, ""));
    var alt = [w + "(?:s|es|d|ed|ing)?", base + "ing"];
    if (/[^aeiou]y$/.test(lw)) alt.push(esc(lw.slice(0, -1)) + "(?:ies|ied)");
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(lw)) alt.push(w + esc(lw.slice(-1)) + "(?:ed|ing)");
    var m = new RegExp("(^|[^A-Za-z])(" + alt.join("|") + ")(?![A-Za-z])", "i").exec(example);
    if (!m) return null;
    var at = m.index + m[1].length;
    return { text: example.slice(0, at) + "______" + example.slice(at + m[2].length), surface: m[2] };
  }

  /* Chuẩn hóa để so sánh câu trả lời: bỏ hoa thường, dấu tiếng Anh/Pháp (résumé), khoảng trắng, gạch nối, dấu nháy. */
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s\-'’.]/g, "");
  }
  function sameAnswer(ans, word, surface) {
    var a = norm(ans);
    return !!a && (a === norm(word) || (!!surface && a === norm(surface)));
  }

  /* Chọn kiểu bài. dir: "f" nhận ra từ (từ -> nghĩa), "r" nhớ lại từ (nghĩa -> từ).
     Kiểu: flip, mc (từ->nghĩa), mcr (nghĩa->từ), cloze (chọn từ vào chỗ trống), type (nghĩa->gõ từ),
     ctype (gõ từ vào chỗ trống), lmc (nghe->chọn nghĩa), dict (nghe->gõ từ), lcloze (nghe câu->gõ từ thiếu). */
  function kindFor(mode, dir, card, hasCloze, listen) {
    var rev = dir === "r";
    if (mode === "flip") return "flip";
    if (mode === "mc") return rev ? "mcr" : "mc";
    if (mode === "cloze") return hasCloze ? (rev ? "ctype" : "cloze") : (rev ? "mcr" : "mc");
    if (mode === "type") return "type";
    if (mode === "listen" && listen) return rev ? "dict" : "lmc";
    if (!card) return "flip";
    var k = card.reps || 0;
    if (!rev) {
      var a = k % 4;
      if (a === 0) return "mc";
      if (a === 1) return listen ? "lmc" : "mcr";
      if (a === 2) return hasCloze ? "cloze" : "mc";
      return "mcr";
    }
    var b = k % 3;
    if (b === 0) return "type";
    if (b === 1) return listen ? "dict" : (hasCloze ? "ctype" : "type");
    return listen && hasCloze ? "lcloze" : hasCloze ? "ctype" : "type";
  }
  function isListenKind(k) { return k === "lmc" || k === "dict" || k === "lcloze"; }

  function isKnown(c) { return !!c && c.s >= KNOWN; }
  function isLeech(c) { return !!c && c.lapses >= LEECH; }

  /* Từ mới hôm nay: từ của bạn được ưu tiên nhưng chỉ chiếm tối đa nửa số chỗ khi bộ TOEIC còn từ chưa học. */
  function pickNew(customIds, toeicIds, cards, room) {
    var cu = customIds.filter(function (id) { return !cards[id]; });
    var to = toeicIds.filter(function (id) { return !cards[id]; });
    var take = to.length ? Math.min(cu.length, Math.ceil(room / 2)) : Math.min(cu.length, room);
    var out = cu.slice(0, take);
    return out.concat(to.slice(0, Math.max(0, room - out.length)));
  }

  /* Thẻ đến hạn: khóa trong cards là "id" (nhận ra) hoặc "id|r" (nhớ lại). Bỏ thẻ mồ côi (từ đã xóa). */
  function dueEntries(cards, validIds, today) {
    var out = [];
    Object.keys(cards).forEach(function (k) {
      var r = k.slice(-2) === "|r", id = r ? k.slice(0, -2) : k;
      if (!validIds[id]) return;
      if (cards[k].due <= today) out.push({ id: id, dir: r ? "r" : "f", due: cards[k].due });
    });
    out.sort(function (a, b) { return a.due - b.due; });
    return out;
  }

  function lessonCount(n) { return Math.ceil(n / LESSON); }
  function lessonRange(i, n) { return [i * LESSON, Math.min(n, (i + 1) * LESSON)]; }

  /* Chia bộ từ (đã xếp từ thường gặp nhất đến hiếm gặp nhất) thành 5 mức, mỗi mức gồm các bài liền nhau. */
  var LEVEL_NAMES = ["Rất thường gặp", "Thường gặp", "Trung bình", "Ít gặp", "Hiếm gặp"];
  function levels(n) {
    var L = lessonCount(n), out = [];
    for (var k = 0; k < 5; k++) {
      var a = Math.round(k * L / 5), b = Math.round((k + 1) * L / 5);
      out.push({ n: k + 1, name: LEVEL_NAMES[k], lessonFrom: a, lessonTo: b, from: a * LESSON, to: Math.min(n, b * LESSON) });
    }
    return out;
  }
  /* Thứ tự học từ mới: bắt đầu từ mức startLevel (1 đến 5), hết thì quay lại các mức đứng trước. */
  function orderFrom(ids, startLevel) {
    var lv = levels(ids.length)[Math.max(1, Math.min(5, startLevel || 1)) - 1];
    return ids.slice(lv.from).concat(ids.slice(0, lv.from));
  }

  /* Tách danh sách từ dán vào. Mỗi dòng: "từ | loại | nghĩa | ví dụ", hoặc "từ = nghĩa", hoặc "từ - nghĩa". */
  function parseBulk(text) {
    var ok = [], bad = [];
    String(text || "").split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var p;
      if (line.indexOf("|") >= 0 || line.indexOf("\t") >= 0) {
        p = line.split(/\||\t/).map(function (x) { return x.trim(); });
        if (p.length === 2) p = [p[0], "", p[1], ""];
        else if (p.length === 3) p = [p[0], "", p[1], p[2]];
      } else {
        var m = /^(.+?)\s+(?:=|-|–|—|:)\s+(.+)$/.exec(line);
        p = m ? [m[1].trim(), "", m[2].trim(), ""] : null;
      }
      if (!p || !p[0] || !p[2]) { bad.push(line); return; }
      ok.push({ w: p[0], pos: p[1] || "", vi: p[2], ex: p[3] || "" });
    });
    return { ok: ok, bad: bad };
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

  /* ---------- thống kê: nhật ký ôn và dự báo ---------- */
  var LOG_KEEP = 60; // giữ nhật ký ôn khoảng 60 ngày
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function keyOf(num) {
    var d = new Date(num * 86400000);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  /* log[ngày] = [số lượt ôn, số lượt nhớ được]. Cộng thêm một lượt và bỏ các ngày quá cũ. */
  function bumpLog(log, key, ok) {
    var e = log[key], n = Array.isArray(e) ? e[0] || 0 : 0, c = Array.isArray(e) ? e[1] || 0 : 0;
    log[key] = [n + 1, c + (ok ? 1 : 0)];
    var t = dayNum(key);
    Object.keys(log).forEach(function (k) { if (dayNum(k) < t - LOG_KEEP) delete log[k]; });
    return log;
  }
  /* `days` ngày gần nhất, từ cũ đến mới; ngày không học bằng 0. */
  function logSeries(log, todayKey, days) {
    var t = dayNum(todayKey), out = [];
    for (var i = days - 1; i >= 0; i--) {
      var key = keyOf(t - i), e = log[key];
      out.push({ key: key, n: e ? e[0] : 0, ok: e ? e[1] : 0 });
    }
    return out;
  }
  /* Làm sạch nhật ký đọc từ máy chủ hoặc bản cũ: bỏ mục hỏng, ép số nguyên, số nhớ được không vượt số lượt. */
  function cleanLog(o) {
    var out = {};
    if (!o || typeof o !== "object" || Array.isArray(o)) return out;
    Object.keys(o).forEach(function (k) {
      var a = o[k];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(a)) return;
      var n = Math.max(0, Math.round(Number(a[0]))), c = Math.max(0, Math.round(Number(a[1])));
      if (!isFinite(n) || !isFinite(c)) return;
      out[k] = [n, Math.min(c, n)];
    });
    return out;
  }
  /* Số thẻ đến hạn mỗi ngày trong `days` ngày kể từ hôm nay. Thẻ quá hạn tính vào hôm nay. */
  function forecast(cards, valid, today, days) {
    var out = [];
    for (var i = 0; i < days; i++) out.push(0);
    Object.keys(cards).forEach(function (k) {
      var id = k.slice(-2) === "|r" ? k.slice(0, -2) : k;
      if (!valid[id]) return;
      var d = Math.max(0, cards[k].due - today);
      if (d < days) out[d]++;
    });
    return out;
  }

  /* ---------- luyện theo chủ đề ---------- */
  /* Tối đa nửa là từ đã học (để ôn), phần còn lại là từ mới theo thứ tự; thiếu bên nào thì bù bằng bên kia.
     shuf: hàm xáo trộn danh sách từ đã học (mặc định giữ nguyên thứ tự, để test được). */
  function pickTopic(ids, cards, n, shuf) {
    shuf = shuf || function (a) { return a; };
    var seen = shuf(ids.filter(function (id) { return cards[id]; })), fresh = ids.filter(function (id) { return !cards[id]; });
    var a = seen.slice(0, Math.ceil(n / 2)), out = a.concat(fresh.slice(0, n - a.length));
    if (out.length < n) out = out.concat(seen.slice(a.length, a.length + n - out.length));
    return out;
  }

  /* ---------- bài đọc: tách từ, đoán dạng gốc, lấy câu ---------- */
  /* Tách văn bản thành các mảnh: từ ({w:true}) và phần còn lại ({w:false}); i là vị trí trong văn bản gốc. */
  function tokenize(text) {
    text = String(text || "");
    var out = [], re = /\p{L}+(?:['’-]\p{L}+)*/gu, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ w: false, s: text.slice(last, m.index), i: last });
      out.push({ w: true, s: m[0], i: m.index });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ w: false, s: text.slice(last), i: last });
    return out;
  }
  function stems(x) {
    var r = [];
    if (x.length < 4) return r;
    if (/'s$/.test(x)) r.push(x.slice(0, -2));
    if (/ies$/.test(x) || /ied$/.test(x)) r.push(x.slice(0, -3) + "y");
    if (/(?:ch|sh|ss|x|z|o)es$/.test(x)) r.push(x.slice(0, -2));
    if (/[^s]s$/.test(x)) r.push(x.slice(0, -1));
    if (/ed$/.test(x)) { r.push(x.slice(0, -2), x.slice(0, -1)); if (/(.)\1$/.test(x.slice(0, -2))) r.push(x.slice(0, -3)); }
    if (/ing$/.test(x)) { var b = x.slice(0, -3); r.push(b, b + "e"); if (/(.)\1$/.test(b)) r.push(b.slice(0, -1)); }
    if (/ily$/.test(x)) r.push(x.slice(0, -3) + "y");
    if (/ly$/.test(x)) r.push(x.slice(0, -2));
    return r;
  }
  /* Các dạng gốc có thể có của một từ trong bài đọc. Từ nguyên dạng (viết thường) luôn đứng đầu. */
  function candidates(tok) {
    var w = String(tok || "").toLowerCase().replace(/’/g, "'"), out = [w];
    function add(x) { if (x.length >= 3 && out.indexOf(x) < 0) out.push(x); }
    stems(w).forEach(add);
    out.slice(1).forEach(function (x) { stems(x).forEach(add); });
    return out;
  }
  /* Câu chứa vị trí pos trong văn bản (ranh giới: . ! ? rồi khoảng trắng, hoặc xuống dòng). */
  function sentenceAt(text, pos) {
    text = String(text || "");
    var n = text.length, a = Math.min(Math.max(0, pos), n), b = a, ch;
    while (a > 0) {
      ch = text.charAt(a - 1);
      if (ch === "\n") break;
      if (/[.!?]/.test(ch) && a < n && /\s/.test(text.charAt(a))) break;
      a--;
    }
    while (b < n) {
      ch = text.charAt(b);
      if (ch === "\n") break;
      if (/[.!?]/.test(ch) && (b + 1 >= n || /\s/.test(text.charAt(b + 1)))) { b++; break; }
      b++;
    }
    return text.slice(a, b).trim();
  }

  TN.logic = {
    LEECH: LEECH, KNOWN: KNOWN, LESSON: LESSON,
    cloze: cloze, norm: norm, sameAnswer: sameAnswer, kindFor: kindFor, isListenKind: isListenKind,
    isKnown: isKnown, isLeech: isLeech, pickNew: pickNew, dueEntries: dueEntries,
    lessonCount: lessonCount, lessonRange: lessonRange, levels: levels, orderFrom: orderFrom, parseBulk: parseBulk,
    dayKey: dayKey, streakStats: streakStats,
    bumpLog: bumpLog, logSeries: logSeries, cleanLog: cleanLog, forecast: forecast,
    pickTopic: pickTopic, tokenize: tokenize, candidates: candidates, sentenceAt: sentenceAt
  };
  if (typeof module !== "undefined" && module.exports) module.exports = TN.logic;
})(typeof window !== "undefined" ? window : globalThis);
