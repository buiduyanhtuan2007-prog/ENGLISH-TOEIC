/* Lặp lại ngắt quãng (dạng SM-2 rút gọn).
   Thẻ: { ef: hệ số dễ, iv: khoảng cách (ngày), reps: số lần nhớ liên tiếp, lapses: số lần quên, due: ngày đến hạn }
   Mức chấm: 0 Quên, 1 Khó, 2 Tốt, 3 Dễ. Ngày tính theo giờ địa phương, đánh số từ 1970. */
(function (root) {
  var TN = (root.TN = root.TN || {});

  function dayNum(date) {
    var d = date || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function fresh() {
    return { ef: 2.5, iv: 0, reps: 0, lapses: 0, due: dayNum() };
  }

  function schedule(c, r, today) {
    var t = today === undefined ? dayNum() : today;
    var n = { ef: c.ef, iv: c.iv, reps: c.reps, lapses: c.lapses, due: t };
    if (r === 0) {
      n.reps = 0;
      n.iv = 0;
      n.lapses = c.lapses + 1;
      n.ef = Math.max(1.3, c.ef - 0.2);
      return n;
    }
    var iv;
    if (c.reps === 0) iv = r === 3 ? 3 : 1;
    else if (c.reps === 1) iv = r === 1 ? 2 : r === 2 ? 4 : 7;
    else {
      iv = Math.round(c.iv * (r === 1 ? 1.2 : r === 2 ? c.ef : c.ef * 1.3));
      if (r !== 1) iv = Math.max(iv, c.iv + 1);
    }
    iv = Math.min(365, Math.max(1, iv));
    if (r === 1) n.ef = Math.max(1.3, c.ef - 0.15);
    if (r === 3) n.ef = c.ef + 0.15;
    n.iv = iv;
    n.reps = c.reps + 1;
    n.due = t + iv;
    return n;
  }

  TN.srs = { dayNum: dayNum, fresh: fresh, schedule: schedule };
  if (typeof module !== "undefined" && module.exports) module.exports = TN.srs;
})(typeof window !== "undefined" ? window : globalThis);
