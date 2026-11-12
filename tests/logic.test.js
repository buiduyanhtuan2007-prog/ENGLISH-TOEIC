// Chạy: node tests/logic.test.js  (cần Node 18 trở lên, không cần cài gì thêm)
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/logic.js");
const S = require("../js/srs.js");

/* ---------- cloze và so khớp đáp án ---------- */
test("cloze che từ có chia dạng và trả về dạng gốc trong câu", () => {
  assert.deepEqual(L.cloze("postpone", "The launch was postponed until next month."),
    { text: "The launch was ______ until next month.", surface: "postponed" });
  assert.deepEqual(L.cloze("agenda", "Please review the agenda before the meeting."),
    { text: "Please review the ______ before the meeting.", surface: "agenda" });
});
test("cloze không che từ chỉ giống phần đầu", () => {
  assert.equal(L.cloze("art", "Read the article about the party."), null);
});
test("cloze nhận dạng chia đổi y thành ies/ied và gấp đôi phụ âm cuối", () => {
  assert.equal(L.cloze("company", "Two companies merged last year.").text, "Two ______ merged last year.");
  assert.equal(L.cloze("study", "She studied abroad for a year.").surface, "studied");
  assert.equal(L.cloze("study", "He is studying law.").surface, "studying");
  assert.equal(L.cloze("stop", "The bus stopped at noon.").surface, "stopped");
  assert.equal(L.cloze("plan", "We are planning a trip.").surface, "planning");
  assert.equal(L.cloze("amenity", "The hotel offers many amenities.").surface, "amenities");
  assert.equal(L.cloze("play", "They played all day.").surface, "played");
  assert.equal(L.cloze("top", "Read the topic carefully."), null);
});
test("cloze trả null khi không có câu ví dụ hoặc không thấy từ", () => {
  assert.equal(L.cloze("budget", ""), null);
  assert.equal(L.cloze("budget", "We have no money."), null);
});
test("cloze với từ có dấu nháy hoặc gạch nối", () => {
  assert.equal(L.cloze("o'clock", "The meeting starts at nine o'clock sharp.").text, "The meeting starts at nine ______ sharp.");
  assert.equal(L.cloze("e-book", "Download the e-book today.").text, "Download the ______ today.");
});
test("sameAnswer bỏ qua hoa thường, dấu, khoảng trắng, gạch nối", () => {
  assert.ok(L.sameAnswer("  Résumé ", "résumé"));
  assert.ok(L.sameAnswer("resume", "résumé"));
  assert.ok(L.sameAnswer("ebook", "e-book"));
  assert.ok(L.sameAnswer("ice cream", "ice cream"));
  assert.ok(L.sameAnswer("postponed", "postpone", "postponed"));
  assert.ok(!L.sameAnswer("postpon", "postpone"));
  assert.ok(!L.sameAnswer("", "x"));
});

/* ---------- chọn kiểu bài ---------- */
test("kindFor: kiểu cố định", () => {
  assert.equal(L.kindFor("flip", "f", { reps: 9 }, true, true), "flip");
  assert.equal(L.kindFor("mc", "f", { reps: 9 }, true, true), "mc");
  assert.equal(L.kindFor("mc", "r", { reps: 9 }, true, true), "mcr");
  assert.equal(L.kindFor("type", "f", undefined, false, false), "type");
  assert.equal(L.kindFor("cloze", "f", undefined, true, false), "cloze");
  assert.equal(L.kindFor("cloze", "r", undefined, true, false), "ctype");
  assert.equal(L.kindFor("cloze", "f", undefined, false, false), "mc");
  assert.equal(L.kindFor("listen", "f", { reps: 0 }, true, true), "lmc");
  assert.equal(L.kindFor("listen", "r", { reps: 0 }, true, true), "dict");
});
test("kindFor: từ chưa học thì thẻ lật", () => {
  assert.equal(L.kindFor("auto", "f", null, true, true), "flip");
});
test("kindFor: chiều nhận ra xoay vòng, có bài nghe khi bật nghe", () => {
  const seq = [0, 1, 2, 3].map(r => L.kindFor("auto", "f", { reps: r }, true, true));
  assert.deepEqual(seq, ["mc", "lmc", "cloze", "mcr"]);
  const noListen = [0, 1, 2, 3].map(r => L.kindFor("auto", "f", { reps: r }, false, false));
  assert.deepEqual(noListen, ["mc", "mcr", "mc", "mcr"]);
});
test("kindFor: chiều nhớ lại bắt gõ từ, có nghe-gõ và nghe câu điền chỗ trống", () => {
  const seq = [0, 1, 2].map(r => L.kindFor("auto", "r", { reps: r }, true, true));
  assert.deepEqual(seq, ["type", "dict", "lcloze"]);
  assert.deepEqual([0, 1, 2].map(r => L.kindFor("auto", "r", { reps: r }, false, false)), ["type", "type", "type"]);
  assert.equal(L.kindFor("auto", "r", { reps: 2 }, true, false), "ctype");
});
test("isListenKind", () => {
  assert.ok(L.isListenKind("lmc") && L.isListenKind("dict") && L.isListenKind("lcloze"));
  assert.ok(!L.isListenKind("mc") && !L.isListenKind("type"));
});

/* ---------- hàng đợi ---------- */
test("pickNew: từ của bạn ưu tiên nhưng tối đa nửa số chỗ khi bộ TOEIC còn từ", () => {
  const cu = ["c:a", "c:b", "c:c", "c:d", "c:e", "c:f"], to = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
  assert.deepEqual(L.pickNew(cu, to, {}, 6), ["c:a", "c:b", "c:c", "t1", "t2", "t3"]);
  assert.deepEqual(L.pickNew(cu, [], {}, 4), ["c:a", "c:b", "c:c", "c:d"]);
  assert.deepEqual(L.pickNew([], to, {}, 3), ["t1", "t2", "t3"]);
});
test("pickNew: bỏ từ đã có thẻ", () => {
  assert.deepEqual(L.pickNew([], ["x", "y", "z"], { x: {} }, 2), ["y", "z"]);
});
test("dueEntries: lấy thẻ đến hạn cả hai chiều, bỏ thẻ mồ côi, sắp theo hạn", () => {
  const cards = { a: { due: 10 }, "a|r": { due: 8 }, b: { due: 12 }, gone: { due: 1 }, "gone|r": { due: 1 } };
  const r = L.dueEntries(cards, { a: 1, b: 1 }, 10);
  assert.deepEqual(r.map(x => x.id + ":" + x.dir), ["a:r", "a:f"]);
});

/* ---------- mức độ của bộ TOEIC ---------- */
test("levels: 5 mức liền nhau phủ hết bộ từ", () => {
  const lv = L.levels(1259);
  assert.equal(lv.length, 5);
  assert.equal(lv[0].from, 0);
  assert.equal(lv[4].to, 1259);
  for (let i = 1; i < 5; i++) assert.equal(lv[i].from, lv[i - 1].to);
  assert.equal(lv[0].name, "Rất thường gặp");
});
test("orderFrom: bắt đầu từ mức chọn rồi quay lại các mức trước", () => {
  const ids = Array.from({ length: 1259 }, (_, i) => "w" + i);
  const lv = L.levels(1259);
  const o = L.orderFrom(ids, 3);
  assert.equal(o[0], "w" + lv[2].from);
  assert.equal(o[o.length - 1], "w" + (lv[2].from - 1));
  assert.equal(o.length, ids.length);
  assert.equal(L.orderFrom(ids, 1)[0], "w0");
});
test("lessonRange cắt đúng ở bài cuối", () => {
  assert.deepEqual(L.lessonRange(0, 1259), [0, 25]);
  assert.deepEqual(L.lessonRange(50, 1259), [1250, 1259]);
  assert.equal(L.lessonCount(1259), 51);
});

/* ---------- dán nhiều từ ---------- */
test("parseBulk: nhiều kiểu phân tách, báo dòng lỗi", () => {
  const r = L.parseBulk("budget | n | ngân sách | The budget is tight.\nagenda = chương trình\nlaunch - ra mắt\nchỉ-một-từ\n\nfoo | bar");
  assert.equal(r.ok.length, 4);
  assert.deepEqual(r.ok[0], { w: "budget", pos: "n", vi: "ngân sách", ex: "The budget is tight." });
  assert.deepEqual(r.ok[1], { w: "agenda", pos: "", vi: "chương trình", ex: "" });
  assert.deepEqual(r.ok[2], { w: "launch", pos: "", vi: "ra mắt", ex: "" });
  assert.deepEqual(r.ok[3], { w: "foo", pos: "", vi: "bar", ex: "" });
  assert.deepEqual(r.bad, ["chỉ-một-từ"]);
});

/* ---------- từ khó, đã thuộc ---------- */
test("isLeech và isKnown", () => {
  assert.ok(L.isLeech({ lapses: 4 }) && !L.isLeech({ lapses: 3 }) && !L.isLeech(null));
  assert.ok(L.isKnown({ s: 21 }) && !L.isKnown({ s: 20.9 }));
});

/* ---------- FSRS ---------- */
test("FSRS: độ nhớ đúng bằng 90% khi ôn đúng hạn", () => {
  for (const s of [1, 5, 30]) assert.ok(Math.abs(S.retrievability(S.interval(0.9, s), s) - 0.9) < 1e-9);
  assert.ok(Math.abs(S.interval(0.9, 7) - 7) < 1e-9);
});
test("FSRS: lần đầu học, Quên/Khó/Tốt/Dễ cho khoảng cách tăng dần", () => {
  const iv = [0, 1, 2, 3].map(r => S.schedule(null, r, 100).iv);
  assert.deepEqual(iv, [1, 1, 2, 8]);
  assert.equal(S.schedule(null, 0, 100).reps, 0);
  assert.equal(S.schedule(null, 2, 100).due, 102);
});
test("FSRS: nhớ đúng hạn thì khoảng cách tăng, và Dễ lâu hơn Khó", () => {
  let c = S.schedule(null, 2, 100);
  let t = c.due;
  const good = S.schedule(c, 2, t), hard = S.schedule(c, 1, t), easy = S.schedule(c, 3, t);
  assert.ok(good.iv > c.iv);
  assert.ok(easy.iv >= good.iv && good.iv >= hard.iv);
  assert.equal(good.reps, 2);
});
test("FSRS: quên thì độ bền giảm, đếm lapses, hẹn lại sau 1 ngày", () => {
  let c = S.schedule(null, 2, 100);
  c = S.schedule(c, 2, c.due);
  const f = S.schedule(c, 0, c.due);
  assert.ok(f.s < c.s);
  assert.equal(f.lapses, 1);
  assert.equal(f.iv, 1);
  assert.equal(f.reps, 0);
});
test("FSRS: sai rồi làm lại trong cùng ngày không tính thêm lỗi quên", () => {
  let c = S.schedule(null, 2, 100);
  c = S.schedule(c, 0, c.due);            // quên thật: lapses 1
  const again = S.schedule(c, 0, c.last); // sai tiếp cùng ngày
  assert.equal(again.lapses, c.lapses);
  const ok = S.schedule(c, 2, c.last);    // đúng cùng ngày
  assert.ok(ok.s >= c.s);
});
test("FSRS: chặn khoảng cách tối đa 365 ngày", () => {
  let c = { s: 5000, d: 3, reps: 20, lapses: 0, last: 1000, due: 1100 };
  assert.equal(S.schedule(c, 3, 1100).iv, 365);
});
test("FSRS: đổi thẻ SM-2 cũ sang thẻ mới", () => {
  const m = S.migrate({ ef: 2.5, iv: 6, reps: 3, lapses: 1, due: 200 });
  assert.equal(m.s, 6); assert.equal(m.last, 194); assert.equal(m.due, 200); assert.equal(m.reps, 3);
  assert.ok(m.d >= 1 && m.d <= 10);
  const keep = { s: 3, d: 5, reps: 1, lapses: 0, last: 1, due: 4 };
  assert.equal(S.migrate(keep), keep);
});

/* ---------- ngày và chuỗi ngày ---------- */
test("dayKey theo giờ địa phương, có số 0 đứng đầu", () => {
  assert.equal(L.dayKey(new Date(2026, 10, 7)), "2026-11-07");
  assert.equal(L.dayKey(new Date(2027, 0, 5)), "2027-01-05");
});

const ALL = [true, true];
const SOME = [true, false];

test("streak: chưa có gì thì bằng 0", () => {
  assert.deepEqual(L.streakStats({}, "2026-11-07", 2),
    { current: 0, best: 0, doneToday: false, doneCount: 0, atRisk: false });
});
test("streak: chỉ tính ngày hoàn thành đủ nhiệm vụ", () => {
  const s = L.streakStats({ "2026-11-07": SOME }, "2026-11-07", 2);
  assert.equal(s.current, 0);
  assert.equal(s.doneCount, 1);
  assert.equal(s.doneToday, false);
});
test("streak: hôm nay đủ thì cộng vào chuỗi", () => {
  const c = { "2026-11-05": ALL, "2026-11-06": ALL, "2026-11-07": ALL };
  const s = L.streakStats(c, "2026-11-07", 2);
  assert.equal(s.current, 3);
  assert.equal(s.doneToday, true);
  assert.equal(s.atRisk, false);
});
test("streak: hôm nay chưa đủ thì giữ chuỗi đến hôm qua và báo nguy cơ", () => {
  const c = { "2026-11-05": ALL, "2026-11-06": ALL, "2026-11-07": SOME };
  const s = L.streakStats(c, "2026-11-07", 2);
  assert.equal(s.current, 2);
  assert.equal(s.atRisk, true);
  assert.equal(s.doneToday, false);
});
test("streak: bỏ lỡ một ngày thì chuỗi hiện tại về 1, chuỗi dài nhất giữ lại", () => {
  const c = { "2026-11-02": ALL, "2026-11-03": ALL, "2026-11-04": ALL, "2026-11-06": ALL, "2026-11-07": ALL };
  const s = L.streakStats(c, "2026-11-07", 2);
  assert.equal(s.current, 2);
  assert.equal(s.best, 3);
});
test("streak: hôm qua không đủ và hôm nay chưa đủ thì bằng 0, không báo nguy cơ", () => {
  const s = L.streakStats({ "2026-11-05": ALL }, "2026-11-07", 2);
  assert.equal(s.current, 0);
  assert.equal(s.atRisk, false);
  assert.equal(s.best, 1);
});
test("streak: qua ranh giới tháng và năm", () => {
  const c = { "2026-12-31": ALL, "2027-01-01": ALL };
  assert.equal(L.streakStats(c, "2027-01-01", 2).current, 2);
});
test("streak: dữ liệu cũ có ít mục hơn số nhiệm vụ thì không tính là đủ", () => {
  assert.equal(L.streakStats({ "2026-11-07": [true] }, "2026-11-07", 2).current, 0);
});

/* ---------- thống kê: nhật ký ôn và dự báo ---------- */
test("bumpLog cộng dồn lượt ôn và lượt nhớ đúng, cắt ngày quá cũ", () => {
  const log = { "2026-08-01": [5, 4], "2026-11-09": [2, 1] };
  L.bumpLog(log, "2026-11-10", true);
  L.bumpLog(log, "2026-11-10", false);
  assert.deepEqual(log["2026-11-10"], [2, 1]);
  assert.deepEqual(log["2026-11-09"], [2, 1]);
  assert.equal(log["2026-08-01"], undefined);
});
test("logSeries: đủ số ngày từ cũ đến mới, ngày không học bằng 0", () => {
  const s = L.logSeries({ "2026-11-10": [4, 3], "2026-11-08": [1, 1] }, "2026-11-10", 5);
  assert.deepEqual(s.map(x => x.key), ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"]);
  assert.deepEqual(s.map(x => x.n), [0, 0, 1, 0, 4]);
  assert.deepEqual(s.map(x => x.ok), [0, 0, 1, 0, 3]);
});
test("logSeries đi qua ranh giới tháng và năm", () => {
  const s = L.logSeries({ "2026-12-31": [2, 2] }, "2027-01-02", 3);
  assert.deepEqual(s.map(x => x.key), ["2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.equal(s[0].n, 2);
});
test("cleanLog bỏ mục hỏng, ép số nguyên và không để số đúng vượt số lượt", () => {
  const c = L.cleanLog({ x: [1, 1], "2026-11-01": [3, 9], "2026-11-02": ["a", 1], "2026-11-03": "no", "2026-11-04": [-2, 1], "2026-11-05": [4.6, 2] });
  assert.deepEqual(c, { "2026-11-01": [3, 3], "2026-11-04": [0, 0], "2026-11-05": [5, 2] });
  assert.deepEqual(L.cleanLog(null), {});
  assert.deepEqual(L.cleanLog([1, 2]), {});
});
test("forecast: thẻ quá hạn tính vào hôm nay, bỏ thẻ mồ côi và thẻ quá xa", () => {
  const cards = { a: { due: 90 }, b: { due: 100 }, c: { due: 101 }, "c|r": { due: 103 }, d: { due: 107 }, zz: { due: 100 }, e: { due: 200 } };
  assert.deepEqual(L.forecast(cards, { a: 1, b: 1, c: 1, d: 1, e: 1 }, 100, 7), [2, 1, 0, 1, 0, 0, 0]);
});

/* ---------- chủ đề ---------- */
test("pickTopic: tối đa nửa là từ đã học, còn lại là từ mới theo thứ tự, thiếu thì bù", () => {
  const ids = Array.from({ length: 30 }, (_, i) => "w" + i);
  const few = { w3: 1, w7: 1, w9: 1, w20: 1 };
  assert.deepEqual(L.pickTopic(ids, few, 10), ["w3", "w7", "w9", "w20", "w0", "w1", "w2", "w4", "w5", "w6"]);
  const many = {}; ids.slice(0, 20).forEach(id => { many[id] = 1; });
  const p = L.pickTopic(ids, many, 10);
  assert.equal(p.length, 10);
  assert.deepEqual(p.slice(5), ["w20", "w21", "w22", "w23", "w24"]);
  const allSeen = {}; ids.forEach(id => { allSeen[id] = 1; });
  assert.equal(L.pickTopic(ids, allSeen, 10).length, 10);
  assert.equal(L.pickTopic(ids.slice(0, 3), {}, 10).length, 3);
});

/* ---------- bài đọc ---------- */
test("tokenize: ghép lại đúng văn bản gốc, nhận từ có dấu nháy, gạch nối, chữ có dấu", () => {
  const t = "Don't miss the e-book: café’s résumé (2026)!";
  const toks = L.tokenize(t);
  assert.equal(toks.map(x => x.s).join(""), t);
  assert.deepEqual(toks.filter(x => x.w).map(x => x.s), ["Don't", "miss", "the", "e-book", "café’s", "résumé"]);
  toks.forEach(x => assert.equal(t.substr(x.i, x.s.length), x.s));
  assert.deepEqual(L.tokenize(""), []);
});
test("candidates: đưa dạng chia về dạng gốc, từ nguyên dạng đứng đầu", () => {
  const has = (tok, base) => assert.ok(L.candidates(tok).includes(base), tok + " -> " + base + " trong " + L.candidates(tok).join(","));
  has("postponed", "postpone"); has("meetings", "meeting"); has("meetings", "meet");
  has("companies", "company"); has("stopped", "stop"); has("running", "run"); has("making", "make");
  has("negotiating", "negotiate"); has("studies", "study"); has("boxes", "box"); has("happily", "happy");
  has("quickly", "quick"); has("tried", "try"); has("employee’s", "employee"); has("managers", "manager");
  assert.equal(L.candidates("Meeting")[0], "meeting");
  assert.deepEqual(L.candidates("bed"), ["bed"]);
  assert.deepEqual(L.candidates("e-book"), ["e-book"]);
});
test("sentenceAt: lấy đúng câu chứa từ", () => {
  const t = "Hello world. The meeting was postponed again! We left early.\nNew line here.";
  assert.equal(L.sentenceAt(t, t.indexOf("postponed")), "The meeting was postponed again!");
  assert.equal(L.sentenceAt(t, t.indexOf("Hello")), "Hello world.");
  assert.equal(L.sentenceAt(t, t.indexOf("early")), "We left early.");
  assert.equal(L.sentenceAt(t, t.indexOf("here")), "New line here.");
  assert.equal(L.sentenceAt("No end mark", 3), "No end mark");
  assert.equal(L.sentenceAt("It costs 3.5 million dollars. Next one.", 14), "It costs 3.5 million dollars.");
});
