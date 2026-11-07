// Chạy: node tests/logic.test.js  (cần Node 18 trở lên, không cần cài gì thêm)
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/logic.js");

test("cloze che từ có chia dạng và trả về dạng gốc trong câu", () => {
  assert.deepEqual(L.cloze("postpone", "The launch was postponed until next month."),
    { text: "The launch was ______ until next month.", surface: "postponed" });
  assert.deepEqual(L.cloze("agenda", "Please review the agenda before the meeting."),
    { text: "Please review the ______ before the meeting.", surface: "agenda" });
});

test("cloze không che từ chỉ giống phần đầu", () => {
  assert.equal(L.cloze("art", "Read the article about the party."), null);
});

test("cloze trả null khi không có câu ví dụ hoặc không thấy từ", () => {
  assert.equal(L.cloze("budget", ""), null);
  assert.equal(L.cloze("budget", "We have no money."), null);
});

test("kindFor: kiểu cố định", () => {
  assert.equal(L.kindFor("flip", { reps: 9 }, true), "flip");
  assert.equal(L.kindFor("mc", { reps: 9 }, true), "mc");
  assert.equal(L.kindFor("type", undefined, false), "type");
  assert.equal(L.kindFor("cloze", undefined, true), "cloze");
  assert.equal(L.kindFor("cloze", undefined, false), "mc");
});

test("kindFor: tự động khó dần theo mức nhớ", () => {
  assert.equal(L.kindFor("auto", undefined, true), "flip");
  assert.equal(L.kindFor("auto", { reps: 0 }, true), "mc");
  assert.equal(L.kindFor("auto", { reps: 1 }, true), "mc");
  assert.equal(L.kindFor("auto", { reps: 2 }, true), "cloze");
  assert.equal(L.kindFor("auto", { reps: 3 }, false), "mc");
  assert.equal(L.kindFor("auto", { reps: 4 }, true), "type");
  assert.equal(L.kindFor("khong-ro", { reps: 4 }, true), "type");
});

test("dayKey theo giờ địa phương, có số 0 đứng đầu", () => {
  assert.equal(L.dayKey(new Date(2026, 10, 7)), "2026-11-07");
  assert.equal(L.dayKey(new Date(2027, 0, 5)), "2027-01-05");
});

const ALL = [true, true, true, true];
const SOME = [true, true, true, false];

test("streak: chưa có gì thì bằng 0", () => {
  assert.deepEqual(L.streakStats({}, "2026-11-07", 4),
    { current: 0, best: 0, doneToday: false, doneCount: 0, atRisk: false });
});

test("streak: chỉ tính ngày hoàn thành đủ nhiệm vụ", () => {
  const s = L.streakStats({ "2026-11-07": SOME }, "2026-11-07", 4);
  assert.equal(s.current, 0);
  assert.equal(s.doneCount, 3);
  assert.equal(s.doneToday, false);
});

test("streak: hôm nay đủ thì cộng vào chuỗi", () => {
  const c = { "2026-11-05": ALL, "2026-11-06": ALL, "2026-11-07": ALL };
  const s = L.streakStats(c, "2026-11-07", 4);
  assert.equal(s.current, 3);
  assert.equal(s.doneToday, true);
  assert.equal(s.atRisk, false);
});

test("streak: hôm nay chưa đủ thì giữ chuỗi đến hôm qua và báo nguy cơ", () => {
  const c = { "2026-11-05": ALL, "2026-11-06": ALL, "2026-11-07": SOME };
  const s = L.streakStats(c, "2026-11-07", 4);
  assert.equal(s.current, 2);
  assert.equal(s.atRisk, true);
  assert.equal(s.doneToday, false);
});

test("streak: bỏ lỡ một ngày thì chuỗi hiện tại về 1, chuỗi dài nhất giữ lại", () => {
  const c = { "2026-11-02": ALL, "2026-11-03": ALL, "2026-11-04": ALL, "2026-11-06": ALL, "2026-11-07": ALL };
  const s = L.streakStats(c, "2026-11-07", 4);
  assert.equal(s.current, 2);
  assert.equal(s.best, 3);
});

test("streak: hôm qua không đủ và hôm nay chưa đủ thì bằng 0, không báo nguy cơ", () => {
  const s = L.streakStats({ "2026-11-05": ALL }, "2026-11-07", 4);
  assert.equal(s.current, 0);
  assert.equal(s.atRisk, false);
  assert.equal(s.best, 1);
});

test("streak: qua ranh giới tháng và năm", () => {
  const c = { "2026-12-31": ALL, "2027-01-01": ALL };
  assert.equal(L.streakStats(c, "2027-01-01", 4).current, 2);
});

test("streak: dữ liệu cũ có ít mục hơn số nhiệm vụ thì không tính là đủ", () => {
  assert.equal(L.streakStats({ "2026-11-07": [true, true] }, "2026-11-07", 4).current, 0);
});
