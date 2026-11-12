// Chạy: node tests/store.test.js  (kiểm tra đọc và nâng cấp dữ liệu đã lưu, không cần trình duyệt)
const test = require("node:test");
const assert = require("node:assert/strict");

// giả lập phần trình duyệt mà store.js dùng
const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.document = { addEventListener() {}, visibilityState: "visible" };
globalThis.addEventListener = () => {};
require("../js/srs.js");
require("../js/logic.js");
require("../js/store.js");
const store = globalThis.TN.store;
const KEY = "toeic-notebook-v1:local";

function load(raw) {
  Object.keys(mem).forEach(k => delete mem[k]);
  if (raw !== undefined) mem[KEY] = typeof raw === "string" ? raw : JSON.stringify(raw);
  store.start(null, null);
  return store.state;
}

test("không có dữ liệu thì dùng mặc định", () => {
  const s = load();
  assert.equal(s.newPerDay, 10); assert.equal(s.startLevel, 1); assert.equal(s.retention, 0.9);
  assert.equal(s.listen, true); assert.equal(s.autoplay, true); assert.equal(s.accent, "en-US");
  assert.deepEqual(s.cards, {}); assert.deepEqual(s.custom, []); assert.deepEqual(s.log, {});
});
test("dữ liệu hỏng (không phải JSON) thì quay về mặc định, không văng lỗi", () => {
  const s = load("{không phải json");
  assert.deepEqual(s.cards, {}); assert.equal(s.newPerDay, 10);
});
test("nâng cấp bản cũ: thẻ SM-2 đổi sang FSRS, từ của bạn dạng mảng đổi sang đối tượng", () => {
  const s = load({
    checks: { "2026-11-01": [true, true] },
    cards: { budget: { ef: 2.5, iv: 6, reps: 3, lapses: 1, due: 200 }, serendipity: { ef: 2.3, iv: 3, reps: 2, lapses: 0, due: 150 }, "serendipity|r": { ef: 2.3, iv: 1, reps: 1, lapses: 0, due: 151 } },
    custom: [["serendipity", "n", "sự tình cờ may mắn", "A happy serendipity."], ["", "", "", ""]],
    notes: { budget: "tiền" }
  });
  assert.equal(s.custom.length, 1);
  assert.deepEqual(s.custom[0], { id: "c:serendipity", w: "serendipity", pos: "n", vi: "sự tình cờ may mắn", ex: "A happy serendipity.", t: 0 });
  assert.ok(s.cards["c:serendipity"] && s.cards["c:serendipity|r"], "thẻ chuyển sang khóa mới");
  assert.equal(s.cards.serendipity, undefined);
  assert.equal(s.cards.budget.s, 6); assert.equal(s.cards.budget.due, 200); assert.equal(s.cards.budget.reps, 3);
  assert.deepEqual(s.checks, { "2026-11-01": [true, true] });
  assert.equal(s.notes.budget, "tiền");
});
test("ép các cài đặt về khoảng hợp lệ", () => {
  const s = load({ newPerDay: 999, startLevel: 9, retention: 0.2, speed: 9, accent: "fr-FR", listen: false, autoplay: false });
  assert.equal(s.newPerDay, 50); assert.equal(s.startLevel, 5); assert.equal(s.retention, 0.7); assert.equal(s.speed, 1.5);
  assert.equal(s.accent, "en-US"); assert.equal(s.listen, false); assert.equal(s.autoplay, false);
  const t = load({ newPerDay: "abc", startLevel: null, retention: "x", speed: "y" });
  assert.equal(t.newPerDay, 10); assert.equal(t.startLevel, 1); assert.equal(t.retention, 0.9); assert.equal(t.speed, 1);
});
test("nhật ký ôn: mục hỏng bị bỏ, số đúng không vượt số lượt, lưu rồi đọc lại vẫn còn", () => {
  const s = load({ log: { x: [1, 1], "2026-11-01": [3, 9], "2026-11-02": "no", "2026-11-03": [5, 2] } });
  assert.deepEqual(s.log, { "2026-11-01": [3, 3], "2026-11-03": [5, 2] });
  globalThis.TN.logic.bumpLog(s.log, "2026-11-03", true);
  store.save();
  const again = load(mem[KEY]);
  assert.deepEqual(again.log["2026-11-03"], [6, 3]);
});
test("kiểu sai (mảng thay cho đối tượng) không làm hỏng trạng thái", () => {
  const s = load({ cards: [], checks: [], notes: 5, sentences: null, edits: [], custom: "x", log: [] });
  assert.deepEqual(s.cards, {}); assert.deepEqual(s.checks, {}); assert.deepEqual(s.notes, {});
  assert.deepEqual(s.custom, []); assert.deepEqual(s.log, {});
});
