/* Lặp lại ngắt quãng theo FSRS-6 (tham số mặc định công bố của dự án open-spaced-repetition).
   Thẻ: { s: độ bền trí nhớ (ngày), d: độ khó 1-10, reps: số lần nhớ liên tiếp,
          lapses: số lần quên thật, last: ngày ôn gần nhất, due: ngày đến hạn }
   Mức chấm r: 0 Quên, 1 Khó, 2 Tốt, 3 Dễ (tương ứng điểm FSRS 1 đến 4).
   Ngày tính theo giờ địa phương, đánh số từ 1970. Khoảng cách tối đa 365 ngày. */
(function (root) {
  var TN = (root.TN = root.TN || {});
  var W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  var MAX_IV = 365;

  function dayNum(date) {
    var d = date || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function factor() { return Math.pow(0.9, -1 / W[20]) - 1; }
  function retrievability(t, s) { return Math.pow(1 + factor() * t / s, -W[20]); }
  function interval(r, s) { return s / factor() * (Math.pow(r, -1 / W[20]) - 1); }
  function d0(g) { return clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10); }
  function nextD(d, g) {
    var n = d + (-W[6] * (g - 3)) * (10 - d) / 9;
    return clamp(W[7] * d0(4) + (1 - W[7]) * n, 1, 10);
  }

  /* Đổi thẻ kiểu cũ (SM-2: ef, iv) sang kiểu mới để không mất tiến độ. */
  function migrate(c) {
    if (c && c.s !== undefined) return c;
    c = c || {};
    var iv = Math.max(1, c.iv || 1), ef = c.ef || 2.5, due = c.due || dayNum();
    return { s: Math.max(0.5, iv), d: clamp(11 - ef * 2, 1, 10), reps: c.reps || 0, lapses: c.lapses || 0, last: due - iv, due: due };
  }

  /* Tính thẻ mới sau khi chấm mức r. c = null nghĩa là từ chưa từng học.
     Kết quả có thêm iv (số ngày đến lần ôn kế) để hiển thị. */
  function schedule(c, r, today, retention) {
    var t = today === undefined ? dayNum() : today, g = r + 1, ret = retention || 0.9, n, s, d;
    if (!c) {
      s = W[g - 1]; d = d0(g);
      n = { s: s, d: d, reps: r === 0 ? 0 : 1, lapses: 0, last: t };
    } else {
      c = migrate(c);
      var el = Math.max(0, t - c.last), R = retrievability(el, c.s);
      d = nextD(c.d, g);
      if (el < 1) {
        // ôn lại trong cùng ngày
        s = c.s * Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(c.s, -W[19]);
        if (g >= 3) s = Math.max(s, c.s);
      } else if (g === 1) {
        s = Math.min(c.s, W[11] * Math.pow(c.d, -W[12]) * (Math.pow(c.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)));
      } else {
        s = c.s * (1 + Math.exp(W[8]) * (11 - c.d) * Math.pow(c.s, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
      }
      n = { s: s, d: d, reps: r === 0 ? 0 : c.reps + 1, lapses: c.lapses + (r === 0 && el >= 1 && c.reps > 0 ? 1 : 0), last: t };
    }
    n.s = clamp(n.s, 0.01, 36500);
    var iv = g === 1 ? 1 : clamp(Math.round(interval(ret, n.s)), 1, MAX_IV);
    n.iv = iv;
    n.due = t + iv;
    return n;
  }

  TN.srs = { dayNum: dayNum, schedule: schedule, migrate: migrate, retrievability: retrievability, interval: interval, WEIGHTS: W, MAX_IV: MAX_IV };
  if (typeof module !== "undefined" && module.exports) module.exports = TN.srs;
})(typeof window !== "undefined" ? window : globalThis);
