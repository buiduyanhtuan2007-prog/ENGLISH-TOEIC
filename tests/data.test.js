// Chạy: node tests/data.test.js  (kiểm tra bộ từ TOEIC và dữ liệu bổ sung)
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/toeic.js");
require("../js/toeic_extra.js");
const L = require("../js/logic.js");
const TN = globalThis.TN;

const POS = new Set(["n", "v", "adj", "adv", "prep", "conj", "pron", "det", "interj"]);
const words = (s) => s.split(/\s+/).filter(Boolean);
function none(list, label) { assert.deepEqual(list, [], label + ": " + list.slice(0, 12).join(" | ")); }

test("bộ TOEIC có 1259 từ, không trùng", () => {
  assert.equal(TN.toeic.length, 1259);
  const seen = new Set(), dup = [];
  TN.toeic.forEach(r => { const k = r[0].toLowerCase(); if (seen.has(k)) dup.push(k); seen.add(k); });
  none(dup, "từ trùng");
});
test("mỗi từ có đủ 4 phần, loại từ hợp lệ, nghĩa ngắn (tối đa 2 nghĩa, mỗi nghĩa tối đa 6 từ)", () => {
  const bad = [];
  TN.toeic.forEach(r => {
    const [w, pos, vi, ex] = r;
    if (r.length !== 4 || !w || !vi || !ex || !POS.has(pos)) { bad.push(w + " (thiếu hoặc loại từ " + pos + ")"); return; }
    const parts = vi.split(/\s*;\s*/);
    if (parts.length > 2 || parts.some(p => words(p).length > 6)) bad.push(w + ": " + vi);
  });
  none(bad, "nghĩa quá dài hoặc dữ liệu thiếu");
});
test("câu ví dụ dài vừa phải và che được từ cần học (cloze)", () => {
  const badLen = [], noCloze = [];
  TN.toeic.forEach(([w, , , ex]) => {
    const n = words(ex).length;
    if (n < 6 || n > 16) badLen.push(w + " (" + n + " từ)");
    if (!L.cloze(w, ex)) noCloze.push(w + ": " + ex);
  });
  none(badLen, "độ dài câu");
  none(noCloze, "không che được từ trong câu");
});

test("dữ liệu bổ sung khớp bộ TOEIC từng dòng", () => {
  assert.ok(Array.isArray(TN.toeicX));
  assert.equal(TN.toeicX.length, TN.toeic.length);
  const bad = [];
  TN.toeic.forEach((r, i) => { if (TN.toeicX[i][0] !== r[0]) bad.push(i + ":" + r[0] + "/" + TN.toeicX[i][0]); });
  none(bad, "lệch dòng");
});
test("12 chủ đề, mỗi từ thuộc đúng một chủ đề và mỗi chủ đề đều có từ", () => {
  assert.equal(TN.TOPICS.length, 12);
  const count = new Array(12).fill(0), bad = [];
  TN.toeicX.forEach(x => { if (!Number.isInteger(x[3]) || x[3] < 0 || x[3] > 11) bad.push(x[0]); else count[x[3]]++; });
  none(bad, "chủ đề sai");
  assert.ok(count.every(c => c >= 30), "mỗi chủ đề có ít nhất 30 từ: " + count.join(","));
});
test("họ từ là chuỗi dạng 'từ (loại)', cụm đi kèm có 1 đến 3 cụm chứa chính từ đó", () => {
  const badFam = [], badCol = [];
  TN.toeicX.forEach(([w, fam, col]) => {
    if (typeof fam !== "string") badFam.push(w);
    else if (fam && !fam.split("; ").every(f => /^[^;()]+ \((n|v|adj|adv|prep|conj|pron|det|interj)\)$/.test(f))) badFam.push(w + ": " + fam);
    if (!Array.isArray(col) || col.length < 1 || col.length > 3 || col.some(c => typeof c !== "string" || !c.trim() || words(c).length > 5)) badCol.push(w);
    else if (!col.some(c => L.cloze(w, c))) badCol.push(w + ": " + col.join(" / "));
  });
  none(badFam, "họ từ sai dạng");
  none(badCol, "cụm đi kèm sai");
});
test("họ từ không lặp lại đúng từ đang học với cùng loại từ (khác loại từ thì được, vì là dạng chuyển loại)", () => {
  const bad = [];
  TN.toeicX.forEach(([w, fam], i) => {
    const pos = TN.toeic[i][1];
    if (fam && fam.split("; ").some(f => f.replace(/ \(.*$/, "").toLowerCase() === w.toLowerCase() && f.indexOf("(" + pos + ")") >= 0)) bad.push(w + ": " + fam);
  });
  none(bad, "họ từ lặp lại từ gốc");
});

test("index.html nạp đủ các script (không quên toeic_extra.js) theo đúng thứ tự phụ thuộc", () => {
  const html = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  ["js/toeic.js", "js/toeic_extra.js", "js/srs.js", "js/logic.js", "js/tts.js", "js/store.js", "js/app.js"].forEach(f =>
    assert.ok(srcs.includes(f), "thiếu script " + f));
  assert.ok(srcs.indexOf("js/toeic_extra.js") > srcs.indexOf("js/toeic.js"), "toeic_extra.js phải sau toeic.js");
  assert.ok(srcs.indexOf("js/toeic_extra.js") < srcs.indexOf("js/app.js"), "toeic_extra.js phải trước app.js");
  const onDisk = require("fs").readdirSync(require("path").join(__dirname, "..", "js")).filter(f => f.endsWith(".js") && f !== "config.js");
  onDisk.forEach(f => assert.ok(srcs.includes("js/" + f), "file js/" + f + " có trên đĩa nhưng index.html không nạp"));
});
