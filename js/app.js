/* Giao diện: đăng nhập, các mục, chuỗi ngày, buổi học nhiều dạng (có bài nghe), bộ TOEIC theo mức, từ của bạn, cài đặt. */
(function () {
  "use strict";
  var TN = window.TN, store = TN.store, srs = TN.srs, L = TN.logic, tts = TN.tts, S = store.state;
  var cfg = window.TN_CONFIG || {};
  var recovering = /type=recovery/.test(location.hash); // đọc trước khi thư viện xóa #hash
  var TASKS = ["Ôn hết thẻ đến hạn", "Học đủ từ mới"];
  var client = null, currentUser = null, ready = false, sess = null, item = null, curDay = srs.dayNum(), cheering = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function btn(text, cls, fn) {
    var b = el("button", cls || "btn", text); b.type = "button";
    if (fn) b.addEventListener("click", fn);
    return b;
  }
  function today() { return L.dayKey(new Date()); }
  function dayChecks(k) { var a = S.checks[k]; return Array.isArray(a) ? a : []; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function plural(n, s) { return n + " " + s; }

  /* ---------- bộ từ: TOEIC (đã xếp theo mức) và từ của bạn ---------- */
  var BASE = Object.create(null), TOEIC_IDS = [], CUSTOM_IDS = [], TOPIC_IDS = [];
  // dữ liệu bổ sung (họ từ, cụm đi kèm, chủ đề) cùng thứ tự với TN.toeic; thiếu hoặc lệch thì bỏ qua, trang vẫn chạy
  var X = TN.toeicX && TN.toeicX.length === TN.toeic.length ? TN.toeicX : [], HAS_X = X.length > 0 && !!TN.TOPICS;
  if (HAS_X) TN.TOPICS.forEach(function () { TOPIC_IDS.push([]); });
  TN.toeic.forEach(function (r, i) {
    var id = r[0].toLowerCase(), x = HAS_X && X[i][0] === r[0] ? X[i] : null;
    BASE[id] = { id: id, w: r[0], pos: r[1], vi: r[2], ex: r[3], src: "t", idx: i, fam: x ? x[1] : "", col: x ? x[2] : [], topic: x ? x[3] : -1 };
    TOEIC_IDS.push(id);
    if (x && TOPIC_IDS[x[3]]) TOPIC_IDS[x[3]].push(id);
  });
  var TOEIC_N = TOEIC_IDS.length, LEVELS = L.levels(TOEIC_N);
  function reindex() {
    CUSTOM_IDS.forEach(function (id) { delete BASE[id]; });
    CUSTOM_IDS = [];
    S.custom.forEach(function (c) {
      BASE[c.id] = { id: c.id, w: c.w, pos: c.pos || "", vi: c.vi, ex: c.ex || "", src: "c", idx: -1 };
      CUSTOM_IDS.push(c.id);
    });
  }
  function W(id) {
    var b = BASE[id];
    if (!b) return null;
    var e = b.src === "t" ? S.edits[id] : null;
    if (!e) return b;
    var o = {};
    Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    o.vi = e.vi || b.vi;
    if (e.ex !== undefined) o.ex = e.ex;
    return o;
  }
  function cardOf(id, dir) { return S.cards[dir === "r" ? id + "|r" : id]; }
  function lessonOfIdx(i) { return Math.floor(i / L.LESSON); }
  function levelOfIdx(i) {
    for (var k = 0; k < LEVELS.length; k++) if (i < LEVELS[k].to) return LEVELS[k];
    return LEVELS[LEVELS.length - 1];
  }
  function toeicOrder() { return L.orderFrom(TOEIC_IDS, S.startLevel); }
  function allIds() { return TOEIC_IDS.concat(CUSTOM_IDS); }
  function stateOf(id) {
    var c = S.cards[id];
    if (!c) return "new";
    if (L.isLeech(c)) return "leech";
    return L.isKnown(c) ? "known" : "learning";
  }
  var STATE_TXT = { "new": "Chưa học", learning: "Đang học", known: "Đã thuộc", leech: "Hay quên" };

  /* ---------- giọng đọc ---------- */
  function say(text) { return tts.speak(text, { lang: S.accent, rate: S.speed }); }
  function listenOn() { return S.listen && tts.available(); }
  function spk(text, label, cls, rate) {
    var b = el("button", "spk " + (cls || ""));
    b.type = "button";
    b.setAttribute("aria-label", label || "Nghe phát âm");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' + (cls === "big" ? "<span>Nghe</span>" : cls === "slow" ? "<span>Chậm</span>" : "");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      b.classList.add("playing");
      tts.speak(text, {
        lang: S.accent,
        rate: rate || S.speed,
        onend: function () { b.classList.remove("playing"); },
        onerror: function () { b.classList.remove("playing"); }
      });
      setTimeout(function () { b.classList.remove("playing"); }, 2500);
    });
    return b;
  }

  /* ---------- màn hình ---------- */
  function showScreen(name) {
    ["boot", "authView", "recoverView", "appView"].forEach(function (id) { $(id).hidden = id !== name; });
  }

  /* ---------- trạng thái đồng bộ ---------- */
  var SYNC = {
    local: "Chỉ lưu trên thiết bị này",
    synced: "Đã đồng bộ",
    saving: "Đang lưu…",
    offline: "Đang ngoại tuyến, sẽ lưu khi có mạng",
    error: "Không lưu được lên máy chủ"
  };
  store.onStatus(function (s) {
    $("sync").setAttribute("data-s", s);
    $("syncTxt").textContent = SYNC[s] || "";
    // đăng nhập: đợi lần đồng bộ đầu xong mới tự tính nhiệm vụ, để không ghi đè tiến độ mới hơn từ thiết bị khác
    if (!ready && currentUser && s !== "saving") {
      ready = true;
      if (!$("appView").hidden) { checkTasks(); renderHome(); renderStreak(); }
    }
  });
  store.onAdopt(function () { sess = null; item = null; reindex(); renderAll(); });

  /* ---------- nhiệm vụ hôm nay (tự tính) và chuỗi ngày ---------- */
  function dueList() { return L.dueEntries(S.cards, BASE, srs.dayNum()); }
  function unseenCount() { var n = 0; allIds().forEach(function (id) { if (!S.cards[id]) n++; }); return n; }
  function newToday() { return S.newDay === srs.dayNum() ? S.newCount : 0; }
  function taskState() {
    var pending = sess && sess.type === "daily" && sess.Q.length > 0;
    return [dueList().length === 0 && !pending, newToday() >= S.newPerDay || unseenCount() === 0];
  }
  function setTask(i) {
    var k = today(), a = TASKS.map(function (_, j) { return !!dayChecks(k)[j]; });
    if (a[i]) return;
    var wasDone = L.streakStats(S.checks, k, TASKS.length).doneToday;
    a[i] = true; S.checks[k] = a; store.save();
    if (!wasDone && L.streakStats(S.checks, k, TASKS.length).doneToday) { cheering = true; burst(); }
  }
  function checkTasks() {
    if (!currentUser || !ready) return;
    taskState().forEach(function (ok, i) { if (ok) setTask(i); });
  }
  function renderTodo() {
    var ul = $("todo"); ul.innerHTML = "";
    var st = taskState(), done = dayChecks(today()), due = dueList().length, nt = newToday();
    var rows = [
      [TASKS[0], done[0] ? "Xong" : "Còn " + due + " thẻ", !!done[0]],
      [TASKS[1], done[1] ? "Xong" : Math.min(nt, S.newPerDay) + "/" + S.newPerDay + " từ", !!done[1]]
    ];
    rows.forEach(function (r) {
      var li = el("li", r[2] ? "on" : ""), mark = el("i"), t = el("span", "t", r[0]), s = el("span", "s", r[1]);
      mark.setAttribute("aria-hidden", "true");
      li.appendChild(mark); li.appendChild(t); li.appendChild(s); ul.appendChild(li);
    });
    var d = new Date(), names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    $("today").textContent = names[d.getDay()] + ", " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + ". Hai việc này tự tính khi bạn học, hoàn thành cả hai thì giữ chuỗi.";
    var left = !st[0] || !st[1];
    $("goStudy").textContent = left ? "Bắt đầu học hôm nay" : "Học thêm";
    $("goStudy").setAttribute("data-go", left ? "daily" : "extra");
  }

  var RING = 2 * Math.PI * 26;
  function renderStreak() {
    var n = TASKS.length, s = L.streakStats(S.checks, today(), n), left = n - s.doneCount;
    var state = s.doneToday ? "done" : s.atRisk ? "risk" : "idle";
    $("hero").setAttribute("data-state", state);
    $("streakNum").textContent = s.current;
    $("bestNum").textContent = Math.max(s.best, s.current);
    $("ringTxt").textContent = s.doneCount + "/" + n;
    var arc = $("ringArc");
    arc.style.strokeDasharray = RING;
    arc.style.strokeDashoffset = RING * (1 - s.doneCount / n);
    $("hint").textContent = state === "done"
      ? "Chuỗi hôm nay đã được giữ. Hẹn gặp lại ngày mai."
      : state === "risk"
        ? "Còn " + left + " việc hôm nay để giữ chuỗi " + s.current + " ngày. Bỏ lỡ một ngày là chuỗi về 0."
        : s.doneCount > 0
          ? "Còn " + left + " việc nữa để bắt đầu chuỗi."
          : "Hoàn thành cả " + n + " việc hôm nay để bắt đầu chuỗi.";
    $("cheer").hidden = !cheering;
    renderWeek();
  }
  function renderWeek() {
    var w = $("week"), n = TASKS.length, names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    w.innerHTML = "";
    for (var k = 6; k >= 0; k--) {
      var d = new Date(); d.setDate(d.getDate() - k);
      var key = L.dayKey(d), c = dayChecks(key).slice(0, n).filter(Boolean).length;
      var box = el("div", k === 0 ? "day now" : "day"), i = el("i", c === n ? "full" : c > 0 ? "part" : "");
      i.title = key + ": " + c + "/" + n;
      box.appendChild(i); box.appendChild(el("span", "", names[d.getDay()])); w.appendChild(box);
    }
  }
  function burst() {
    var box = $("confetti"), cols = ["#F97316", "#FBBF24", "#0D9488", "#2563EB", "#EC4899", "#8B5CF6", "#10B981"];
    box.innerHTML = "";
    for (var i = 0; i < 36; i++) {
      var s = el("span"), a = Math.random() * Math.PI * 2, r = 75 + Math.random() * 130;
      s.style.setProperty("--dx", Math.round(Math.cos(a) * r) + "px");
      s.style.setProperty("--dy", Math.round(Math.sin(a) * r - 45) + "px");
      s.style.setProperty("--rot", Math.round(Math.random() * 720) + "deg");
      s.style.background = cols[i % cols.length];
      if (i % 2 === 0) { s.style.borderRadius = "50%"; s.style.width = "9px"; s.style.height = "9px"; }
      box.appendChild(s);
    }
    var f = $("flame"); if (f) { f.classList.remove("pop"); void f.offsetWidth; f.classList.add("pop"); }
  }

  function renderHome() {
    var due = dueList().length, learned = 0, known = 0, leech = 0, toeicSeen = 0, firstNew = -1;
    allIds().forEach(function (id) {
      var c = S.cards[id];
      if (!c) return;
      learned++;
      if (L.isKnown(c)) known++;
    });
    Object.keys(S.cards).forEach(function (k) {
      var id = k.slice(-2) === "|r" ? k.slice(0, -2) : k;
      if (BASE[id] && L.isLeech(S.cards[k])) leech++;
    });
    TOEIC_IDS.forEach(function (id) { if (S.cards[id]) toeicSeen++; });
    $("sDue").textContent = due; $("sLearned").textContent = learned; $("sKnown").textContent = known;
    var bd = $("dueBadge"); bd.textContent = due; bd.hidden = due === 0;
    $("deckTxt").textContent = "Đã học " + toeicSeen + "/" + TOEIC_N + " từ";
    $("deckBar").style.width = (TOEIC_N ? Math.round(toeicSeen / TOEIC_N * 100) : 0) + "%";
    var nx = toeicOrder().filter(function (id) { return !S.cards[id]; })[0];
    $("deckLvl").textContent = nx ? "Từ mới tiếp theo thuộc mức " + levelOfIdx(BASE[nx].idx).n + " · " + levelOfIdx(BASE[nx].idx).name + "." : "Bạn đã học hết bộ TOEIC. Các từ sẽ quay lại theo lịch ôn.";
    $("leechBox").hidden = leech === 0;
    $("leechTxt").textContent = leech + " thẻ bạn đã quên nhiều lần. Thử ghi một mẹo nhớ riêng cho từng từ.";
    renderTodo();
    renderStats();
  }

  /* ---------- thống kê: nhật ký 14 ngày và dự báo 7 ngày ---------- */
  var WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"], TRACK = 84;
  function barChart(box, cols, max, showVal) {
    box.innerHTML = "";
    cols.forEach(function (c) {
      var col = el("div", c.now ? "bc now" : "bc"), tr = el("div", "tr"), all = el("i", "all");
      col.title = c.tip;
      col.appendChild(el("span", "v", showVal && c.n ? String(c.n) : ""));
      all.style.height = (c.n ? Math.max(3, Math.round(c.n / max * TRACK)) : 2) + "px";
      if (c.n && c.ok !== undefined) {
        var ok = el("b"); ok.style.height = Math.round(c.ok / c.n * 100) + "%"; all.appendChild(ok);
      }
      if (!c.n) all.className = "all zero";
      tr.appendChild(all); col.appendChild(tr);
      col.appendChild(el("span", "l", c.label));
      box.appendChild(col);
    });
  }
  function renderStats() {
    var k = today(), series = L.logSeries(S.log, k, 14), total = 0, ok = 0, best = null, days = 0;
    series.forEach(function (d) {
      total += d.n; ok += d.ok;
      if (d.n) days++;
      if (d.n && (!best || d.n > best.n)) best = d;
    });
    var fc = L.forecast(S.cards, BASE, srs.dayNum(), 7), fsum = fc.reduce(function (a, b) { return a + b; }, 0);
    $("statsTxt").textContent = total
      ? "14 ngày qua bạn ôn " + total + " lượt trong " + days + " ngày, nhớ được " + Math.round(ok / total * 100) + "%."
      : "Chưa có lượt ôn nào trong 14 ngày qua. Học vài thẻ là biểu đồ sẽ hiện ra.";
    var maxL = Math.max(1, best ? best.n : 0), d0 = new Date();
    barChart($("logBars"), series.map(function (d, i) {
      var dt = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - (13 - i)), dd = dt.getDate() + "/" + (dt.getMonth() + 1);
      return { n: d.n, ok: d.ok, label: WD[dt.getDay()], now: i === 13, tip: dd + ": " + (d.n ? d.n + " lượt, nhớ được " + d.ok + " (" + Math.round(d.ok / d.n * 100) + "%)" : "không ôn") };
    }), maxL, false);
    $("logBars").setAttribute("aria-label", "Biểu đồ cột số lượt ôn 14 ngày qua. " + (total ? "Tổng " + total + " lượt." : "Chưa có lượt nào."));
    $("logNote").textContent = best ? "Nhiều nhất: " + best.n + " lượt vào " + Number(best.key.slice(8)) + "/" + Number(best.key.slice(5, 7)) + "." : "";
    var maxF = Math.max.apply(null, fc.concat([1]));
    barChart($("dueBars"), fc.map(function (n, i) {
      var dt = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
      return { n: n, label: i === 0 ? "Nay" : i === 1 ? "Mai" : WD[dt.getDay()], now: i === 0, tip: dt.getDate() + "/" + (dt.getMonth() + 1) + ": " + n + " thẻ đến hạn" };
    }), maxF, true);
    $("dueBars").setAttribute("aria-label", "Biểu đồ cột số thẻ đến hạn 7 ngày tới. Tổng " + fsum + " thẻ.");
    $("dueNote").textContent = fsum ? "Tổng " + fsum + " thẻ trong 7 ngày tới." : "Chưa có thẻ nào đến hạn trong 7 ngày tới.";
  }

  /* ---------- buổi học ---------- */
  var pendingHash = null; // đã tự vẽ khi chuyển mục, bỏ qua sự kiện hashchange đến muộn để không vẽ hai lần
  function go(v) { pendingHash = v; location.hash = v; showView(); }
  function startSession(type, entries, title, force) {
    sess = { type: type, Q: entries, total: entries.length, title: title, force: force || null };
    item = null;
    go("hoc");
  }
  function startDaily() {
    var q = dueList().map(function (e) { return { id: e.id, dir: e.dir }; });
    var room = Math.max(0, S.newPerDay - newToday());
    L.pickNew(CUSTOM_IDS, toeicOrder(), S.cards, room).forEach(function (id) { q.push({ id: id, dir: "f" }); });
    startSession("daily", q, "Học hôm nay");
  }

  function applyRating(e, r) {
    var t = srs.dayNum(), key = e.dir === "r" ? e.id + "|r" : e.id, c = S.cards[key] || null;
    if (!c && e.dir === "f") {
      if (S.newDay === t) S.newCount++; else { S.newDay = t; S.newCount = 1; }
    }
    var n = srs.schedule(c, r, t, S.retention);
    S.cards[key] = n;
    // nhớ được hai lần liên tiếp thì mở thêm thẻ chiều "nhớ lại từ" (nghĩa -> từ)
    if (e.dir === "f" && r >= 1 && n.reps >= 2 && !S.cards[e.id + "|r"]) {
      var rc = srs.schedule(null, 1, t, S.retention);
      rc.reps = 0; rc.due = t + 1; rc.iv = 1;
      S.cards[e.id + "|r"] = rc;
    }
    L.bumpLog(S.log, today(), r >= 1); // nhật ký cho mục Thống kê: nhớ được là Khó, Tốt hoặc Dễ
    store.save();
    return n;
  }
  function advance(bad) {
    var Q = sess.Q;
    if (bad) { if (Q.length > 1) Q.push(Q.shift()); } else Q.shift();
    item = null;
    checkTasks();
  }

  function distract(w, n) {
    var pool = allIds().filter(function (id) { return id !== w.id; }).map(W);
    var seen = {}; seen[w.vi] = 1; seen[w.w] = 1;
    pool = pool.filter(function (x) { if (seen[x.vi] || seen[x.w]) return false; return true; });
    var same = shuffle(pool.filter(function (x) { return x.pos === w.pos; }));
    var rest = shuffle(pool.filter(function (x) { return x.pos !== w.pos; }));
    var out = [];
    same.concat(rest).forEach(function (x) {
      if (out.length >= n) return;
      if (out.some(function (o) { return o.vi === x.vi || o.w === x.w; })) return;
      out.push(x);
    });
    return out;
  }
  function makeItem(e) {
    var w = W(e.id), c = cardOf(e.id, e.dir), cz = L.cloze(w.w, w.ex);
    var kind = !c && e.dir === "f" ? "flip" : L.kindFor(sess.force === "listen" ? "listen" : S.mode, e.dir, c, !!cz, listenOn());
    var it = { e: e, w: w, kind: kind, done: false, ok: null, flip: false, cz: cz, played: false };
    if (kind === "mc" || kind === "mcr" || kind === "cloze" || kind === "lmc") it.opts = shuffle([w].concat(distract(w, 3)));
    return it;
  }

  function promptBox(label) {
    var p = el("div", "prompt");
    p.appendChild(el("div", "lab", label));
    return p;
  }
  function posTag(w) { return w.pos ? el("div", "pos", "(" + w.pos + ")") : null; }

  /* Họ từ, cụm hay đi kèm và (khi full) mức và chủ đề. Chỉ từ của bộ TOEIC mới có các dữ liệu này. */
  function xrow(label, text) {
    var r = el("div", "xr");
    r.appendChild(el("b", "", label)); r.appendChild(el("span", "", text));
    return r;
  }
  function extraInfo(w, full) {
    if (w.src !== "t") return null;
    var box = el("div", "xinfo");
    if (full) {
      var lv = levelOfIdx(w.idx);
      box.appendChild(xrow("Mức", lv.n + " · " + lv.name + (w.topic >= 0 && HAS_X ? " · " + TN.TOPICS[w.topic] : "")));
    }
    if (w.fam) box.appendChild(xrow("Họ từ", w.fam));
    if (w.col && w.col.length) box.appendChild(xrow("Hay đi với", w.col.join(" · ")));
    return box.firstChild ? box : null;
  }

  function nextDue() {
    var t = srs.dayNum(), next = null;
    Object.keys(S.cards).forEach(function (k) {
      var id = k.slice(-2) === "|r" ? k.slice(0, -2) : k;
      if (BASE[id] && S.cards[k].due > t && (next === null || S.cards[k].due < next)) next = S.cards[k].due;
    });
    return next;
  }
  function dayLabel(n) { var d = new Date(n * 86400000); return d.getUTCDate() + "/" + (d.getUTCMonth() + 1); }

  function renderSession() {
    var st = $("study"); st.innerHTML = "";
    if (!sess) { go("hom-nay"); return; }
    $("sessTitle").textContent = sess.title;
    var prog = $("sessProgress");
    if (prog && sess.total) {
      var pct = Math.min(100, Math.round(((sess.total - sess.Q.length) / sess.total) * 100));
      prog.style.width = pct + "%";
    }
    if (!sess.Q.length) { item = null; $("sessLeft").textContent = ""; $("keys").textContent = ""; drawEnd(st); return; }
    $("sessLeft").textContent = "Còn " + sess.Q.length;
    if (!item || item.e !== sess.Q[0]) item = makeItem(sess.Q[0]);
    var k = item.kind;
    if (k === "flip") drawFlip(st);
    else if (k === "type" || k === "ctype" || k === "dict" || k === "lcloze") drawType(st);
    else drawChoice(st);
    autoplay();
  }
  function autoplay() {
    if (item.played || item.done || !tts.available()) return;
    item.played = true;
    var k = item.kind;
    if (k === "lmc" || k === "dict") say(item.w.w);
    else if (k === "lcloze") say(item.w.ex);
    else if (k === "flip" && S.autoplay && S.listen && item.e.dir === "f") say(item.w.w);
  }

  function drawEnd(st) {
    if (sess && sess.total) burst();
    var p = el("div", "prompt end"), nd = nextDue();
    p.appendChild(el("div", "big", sess.total ? "Xong lượt này" : sess.type === "daily" ? "Hôm nay không còn thẻ nào" : "Chưa có thẻ phù hợp"));
    var msg = sess.type === "daily"
      ? (taskState()[1] ? "Bạn đã hoàn thành việc hôm nay." : "Còn từ mới chưa học, nhưng hôm nay bạn đã học đủ chỉ tiêu.")
      : "Kết quả đã được ghi vào lịch ôn.";
    p.appendChild(el("div", "ex", msg + (nd !== null ? " Thẻ tiếp theo đến hạn ngày " + dayLabel(nd) + "." : "")));
    st.appendChild(p);
    var row = el("div", "row-btns");
    row.appendChild(btn("Học thêm", "btn pri", function () { go("hoc-them"); }));
    row.appendChild(btn("Về trang chủ", "btn", function () { go("hom-nay"); }));
    st.appendChild(row);
  }

  function drawFlip(st) {
    var w = item.w, rev = item.e.dir === "r", card = el("button", "card"), tools = el("div", "cardtools"), rt = el("div", "rate");
    card.type = "button";
    var isNew = !cardOf(item.e.id, item.e.dir);
    if (!item.flip) {
      if (rev) {
        card.appendChild(el("div", "mean", w.vi));
        var p1 = posTag(w); if (p1) card.appendChild(p1);
        card.appendChild(el("div", "hint", "Nhớ lại từ tiếng Anh rồi chạm hoặc nhấn Space để lật"));
      } else {
        card.appendChild(el("div", "w", w.w));
        var p2 = posTag(w); if (p2) card.appendChild(p2);
        card.appendChild(el("div", "hint", isNew ? "Từ mới. Chạm hoặc nhấn Space để xem nghĩa" : "Chạm hoặc nhấn Space để lật thẻ"));
      }
    } else {
      card.classList.add("flipped");
      card.appendChild(el("div", "w", w.w));
      card.appendChild(el("div", "mean", w.vi));
      if (w.ex) card.appendChild(el("div", "ex", w.ex));
      var xi = extraInfo(w, false); if (xi) card.appendChild(xi);
      if (S.notes[w.id]) card.appendChild(el("div", "note", "Mẹo nhớ: " + S.notes[w.id]));
    }
    card.addEventListener("click", function () { item.flip = !item.flip; renderSession(); });
    var c = cardOf(item.e.id, item.e.dir) || null, t = srs.dayNum();
    ["Quên", "Khó", "Tốt", "Dễ"].forEach(function (name, r) {
      var b = el("button", "r" + r, name); b.type = "button"; b.disabled = !item.flip;
      b.appendChild(el("small", "", item.flip ? ivText(srs.schedule(c, r, t, S.retention).iv) : ""));
      b.addEventListener("click", function () { rate(r); });
      rt.appendChild(b);
    });
    if (listenOn()) { tools.appendChild(spk(w.w, "Nghe từ")); if (w.ex && item.flip) tools.appendChild(spk(w.ex, "Nghe câu ví dụ", "ex")); }
    st.appendChild(card);
    if (tools.firstChild) st.appendChild(tools);
    st.appendChild(rt);
    if (item.flip) st.appendChild(wordTools(w.id, false));
    $("keys").innerHTML = "<kbd>Space</kbd> lật thẻ · <kbd>1</kbd> Quên · <kbd>2</kbd> Khó · <kbd>3</kbd> Tốt · <kbd>4</kbd> Dễ";
  }
  function ivText(n) { return n <= 1 ? "1 ngày" : n + " ngày"; }
  function rate(r) {
    if (!item || item.kind !== "flip" || !item.flip) return;
    applyRating(item.e, r);
    advance(r === 0);
    renderSession();
  }

  function drawChoice(st) {
    var w = item.w, k = item.kind, p;
    if (k === "mc") {
      p = promptBox("Chọn nghĩa đúng");
      p.appendChild(el("div", "big", w.w));
      var pp = posTag(w); if (pp) p.appendChild(pp);
      if (listenOn()) p.appendChild(spk(w.w, "Nghe từ"));
    } else if (k === "mcr") {
      p = promptBox("Chọn từ tiếng Anh đúng");
      p.appendChild(el("div", "big", w.vi));
      var pq = posTag(w); if (pq) p.appendChild(pq);
    } else if (k === "cloze") {
      p = promptBox("Chọn từ điền vào chỗ trống (có thể cần chia dạng)");
      p.appendChild(el("div", "cz", item.cz.text));
    } else {
      p = promptBox("Nghe và chọn nghĩa đúng");
      p.appendChild(spk(w.w, "Nghe từ", "big"));
    }
    var showVi = k === "mc" || k === "lmc", opts = el("div", "opts");
    item.opts.forEach(function (o, i) {
      var b = el("button", "opt"); b.type = "button";
      b.appendChild(el("span", "b", "ABCD".charAt(i)));
      b.appendChild(el("span", "t", showVi ? o.vi : o.w));
      if (item.done) {
        b.disabled = true;
        if (o.id === w.id) b.classList.add("right");
        else if (i === item.pick) b.classList.add("wrong");
      }
      b.addEventListener("click", function () { choose(i); });
      opts.appendChild(b);
    });
    st.appendChild(p); st.appendChild(opts);
    if (item.done) drawFeedback(st);
    $("keys").innerHTML = item.done ? "<kbd>Enter</kbd> sang bài tiếp" : "Phím <kbd>1</kbd> đến <kbd>4</kbd> chọn đáp án";
  }
  function choose(i) {
    if (!item || item.done) return;
    item.done = true; item.pick = i; item.ok = item.opts[i].id === item.w.id;
    finish();
  }

  function drawType(st) {
    var w = item.w, k = item.kind, p;
    var hint = "Bắt đầu bằng “" + w.w.charAt(0) + "”, " + w.w.length + " ký tự";
    if (k === "type") {
      p = promptBox("Gõ từ tiếng Anh có nghĩa");
      p.appendChild(el("div", "big", w.vi));
      var a = posTag(w); if (a) p.appendChild(a);
      p.appendChild(el("div", "pos", hint));
    } else if (k === "ctype") {
      p = promptBox("Gõ từ còn thiếu trong câu");
      p.appendChild(el("div", "cz", item.cz.text));
      p.appendChild(el("div", "pos", "Nghĩa: " + w.vi + " · " + hint));
    } else if (k === "dict") {
      p = promptBox("Nghe và gõ từ bạn nghe được");
      var row = el("div", "bigrow"); row.appendChild(spk(w.w, "Nghe từ", "big"));
      row.appendChild(spk(w.w, "Nghe chậm", "slow", 0.6));
      p.appendChild(row);
    } else {
      p = promptBox("Nghe câu và gõ từ còn thiếu");
      var row2 = el("div", "bigrow"); row2.appendChild(spk(w.ex, "Nghe câu", "big"));
      p.appendChild(row2);
      p.appendChild(el("div", "cz", item.cz.text));
      p.appendChild(el("div", "pos", "Nghĩa: " + w.vi));
    }
    var f = el("form", "tyform"), inp = el("input"), go1 = el("button", "btn pri", "Kiểm tra");
    inp.id = "tyIn"; inp.type = "text"; inp.autocomplete = "off"; inp.autocapitalize = "none"; inp.spellcheck = false;
    inp.setAttribute("aria-label", "Từ tiếng Anh"); go1.type = "submit";
    if (item.done) { inp.value = item.ans; inp.disabled = true; inp.classList.add(item.ok ? "ok" : "bad"); go1.hidden = true; }
    f.appendChild(inp); f.appendChild(go1);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (item.done) return;
      var ans = inp.value.trim();
      if (!ans) return;
      item.done = true; item.ans = ans;
      item.ok = L.sameAnswer(ans, w.w, item.cz ? item.cz.surface : "");
      finish();
    });
    st.appendChild(p); st.appendChild(f);
    if (item.done) drawFeedback(st); else setTimeout(function () { var i2 = $("tyIn"); if (i2 && !item.done && k !== "dict" && k !== "lcloze") i2.focus(); }, 0);
    $("keys").innerHTML = item.done ? "<kbd>Enter</kbd> sang bài tiếp" : "Gõ từ rồi nhấn <kbd>Enter</kbd>";
  }

  function finish() {
    var n = applyRating(item.e, item.ok ? 2 : 0);
    item.iv = n.iv;
    item.leech = !item.ok && L.isLeech(n);
    renderSession();
    var nx = $("study").querySelector(".next");
    if (nx) nx.focus();
  }
  function drawFeedback(st) {
    var w = item.w, fb = el("div", "fb " + (item.ok ? "ok" : "bad"));
    fb.appendChild(el("b", "res", item.ok ? "Đúng." : "Chưa đúng."));
    var line = el("span", "", w.w + (w.pos ? " (" + w.pos + ")" : "") + ": " + w.vi);
    fb.appendChild(line);
    if (w.ex) fb.appendChild(el("span", "ex", w.ex));
    var xi = extraInfo(w, false); if (xi) fb.appendChild(xi);
    if (S.notes[w.id]) fb.appendChild(el("span", "ex", "Mẹo nhớ: " + S.notes[w.id]));
    fb.appendChild(el("span", "iv", item.iv > 1 || item.ok ? "Gặp lại sau " + ivText(item.iv) + "." : "Sẽ gặp lại trong lượt này."));
    if (item.leech) fb.appendChild(el("span", "leech", "Từ này bạn đã quên nhiều lần. Thử ghi một mẹo nhớ riêng bên dưới: một hình ảnh, từ tiếng Việt nghe giống, hoặc câu chuyện ngắn."));
    if (listenOn()) { var r = el("div", "cardtools"); r.appendChild(spk(w.w, "Nghe từ")); if (w.ex) r.appendChild(spk(w.ex, "Nghe câu ví dụ", "ex")); fb.appendChild(r); }
    st.appendChild(fb);
    var typed = item.kind === "type" || item.kind === "ctype" || item.kind === "dict" || item.kind === "lcloze";
    if (item.ok && typed && !S.sentences[w.id]) st.appendChild(sentenceBox(w.id));
    st.appendChild(wordTools(w.id, !!item.leech));
    var nx = btn("Tiếp", "btn pri next", function () { advance(item.ok === false); renderSession(); });
    st.appendChild(nx);
  }

  /* ---------- ghi chú, câu của bạn, sửa từ ---------- */
  function sentenceBox(id) {
    var box = el("div", "sent"), saved = S.sentences[id];
    if (saved) { box.appendChild(el("p", "ex", "Câu của bạn: " + saved)); return box; }
    box.appendChild(el("label", "", "Viết một câu của riêng bạn với từ này (không bắt buộc)"));
    var f = el("form", "tyform"), inp = el("input"), b = el("button", "btn", "Lưu");
    inp.type = "text"; inp.placeholder = "Một câu tiếng Anh dùng từ này"; inp.autocomplete = "off"; inp.setAttribute("aria-label", "Câu của bạn");
    b.type = "submit";
    f.appendChild(inp); f.appendChild(b); box.appendChild(f);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inp.value.trim();
      if (!v) return;
      var w = W(id);
      S.sentences[id] = v; store.save();
      box.innerHTML = "";
      box.appendChild(el("p", "ex", "Đã lưu: " + v + (L.cloze(w.w, v) ? "" : " (câu chưa chứa từ này, bạn kiểm tra lại nhé)")));
    });
    return box;
  }
  function saveEdit(id, vi, ex, pos) {
    var b = BASE[id];
    if (b.src === "t") {
      if (vi === b.vi && ex === b.ex) delete S.edits[id]; else S.edits[id] = { vi: vi, ex: ex };
    } else {
      S.custom.forEach(function (c) { if (c.id === id) { c.vi = vi; c.ex = ex; if (pos !== undefined) c.pos = pos; } });
      reindex();
    }
    store.save();
  }
  function wordTools(id, open) {
    var d = el("details", "tools"), w = W(id);
    if (open) d.open = true;
    d.appendChild(el("summary", "", "Ghi chú gợi nhớ và sửa từ"));
    var note = el("textarea");
    note.rows = 2; note.placeholder = "Mẹo nhớ: hình ảnh, từ tiếng Việt nghe giống, câu chuyện ngắn…"; note.value = S.notes[id] || "";
    note.setAttribute("aria-label", "Mẹo nhớ");
    note.addEventListener("change", function () {
      var v = note.value.trim();
      if (v) S.notes[id] = v; else delete S.notes[id];
      store.save();
    });
    d.appendChild(note);
    var f = el("form", "editf"), vi = el("input"), ex = el("input"), b = el("button", "btn sm", "Lưu chỉnh sửa"), msg = el("span", "mini");
    vi.value = w.vi; vi.setAttribute("aria-label", "Nghĩa tiếng Việt"); vi.placeholder = "Nghĩa";
    ex.value = w.ex; ex.setAttribute("aria-label", "Câu ví dụ"); ex.placeholder = "Câu ví dụ";
    b.type = "submit";
    f.appendChild(vi); f.appendChild(ex); f.appendChild(b); f.appendChild(msg);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = vi.value.trim();
      if (!v) { msg.textContent = "Nghĩa không được để trống."; return; }
      saveEdit(id, v, ex.value.trim());
      if (item && item.w.id === id) item.w = W(id);
      msg.textContent = "Đã lưu.";
    });
    d.appendChild(f);
    if (BASE[id].src === "t" && S.edits[id]) {
      d.appendChild(btn("Khôi phục bản gốc", "btn sm", function () {
        delete S.edits[id]; store.save();
        var w2 = W(id); vi.value = w2.vi; ex.value = w2.ex; msg.textContent = "Đã khôi phục.";
        if (item && item.w.id === id) item.w = W(id);
      }));
    }
    return d;
  }

  $("sessExit").addEventListener("click", function () { sess = null; item = null; checkTasks(); go("hom-nay"); });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($("appView").hidden || $("v-hoc").hidden || !item || !sess || !sess.Q.length) return;
    var n = e.key >= "1" && e.key <= "4" ? parseInt(e.key, 10) - 1 : -1;
    if (item.kind === "flip") {
      if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); item.flip = !item.flip; renderSession(); }
      else if (n >= 0) rate(n);
    } else if (item.done) {
      if ((e.key === "Enter" || e.key === " ") && tag !== "BUTTON") { e.preventDefault(); advance(item.ok === false); renderSession(); }
    } else if (item.opts && n >= 0 && n < item.opts.length) choose(n);
  });

  /* ---------- học thêm ---------- */
  function learnedIds() { return allIds().filter(function (id) { return S.cards[id]; }); }
  function entriesFromKeys(keys) {
    return keys.map(function (k) { var r = k.slice(-2) === "|r"; return { id: r ? k.slice(0, -2) : k, dir: r ? "r" : "f" }; })
      .filter(function (e) { return BASE[e.id]; });
  }
  function extraSources() {
    var t = srs.dayNum(), keys = Object.keys(S.cards).filter(function (k) { return BASE[k.slice(-2) === "|r" ? k.slice(0, -2) : k]; });
    var news = L.pickNew(CUSTOM_IDS, toeicOrder(), S.cards, 10);
    var early = keys.filter(function (k) { return S.cards[k].due > t; }).sort(function (a, b) { return S.cards[a].due - S.cards[b].due; }).slice(0, 20);
    var leech = keys.filter(function (k) { return L.isLeech(S.cards[k]); });
    var learned = learnedIds();
    return [
      { title: "Từ mới thêm", desc: "Học thêm tối đa 10 từ mới nữa, ngoài chỉ tiêu hôm nay.", n: news.length, label: "từ",
        run: function () { startSession("extra", news.map(function (id) { return { id: id, dir: "f" }; }), "Học thêm: từ mới"); } },
      { title: "Ôn trước hạn", desc: "Ôn các thẻ sắp đến hạn (20 thẻ gần nhất). Ôn sớm vẫn được tính vào lịch.", n: early.length, label: "thẻ",
        run: function () { startSession("extra", entriesFromKeys(early), "Học thêm: ôn trước hạn"); } },
      { title: "Từ hay quên", desc: "Các thẻ bạn đã quên từ " + L.LEECH + " lần trở lên. Nên ghi mẹo nhớ riêng cho từng từ.", n: leech.length, label: "thẻ",
        run: function () { startSession("extra", shuffle(entriesFromKeys(leech)), "Học thêm: từ hay quên"); } },
      { title: "Luyện nghe", desc: tts.available() && S.listen ? "15 từ đã học, chỉ có bài nghe: nghe chọn nghĩa và nghe gõ từ." : "Cần bật bài nghe trong Cài đặt và thiết bị có giọng đọc.", n: tts.available() && S.listen ? Math.min(15, learned.length) : 0, label: "từ",
        run: function () {
          var q = shuffle(learned.slice()).slice(0, 15).map(function (id) { return { id: id, dir: S.cards[id + "|r"] ? "r" : "f" }; });
          startSession("extra", q, "Học thêm: luyện nghe", "listen");
        } },
      { title: "Ôn tự do ngẫu nhiên", desc: "20 từ đã học, chọn ngẫu nhiên, không quan tâm đến hạn.", n: Math.min(20, learned.length), label: "từ",
        run: function () { startSession("extra", shuffle(learned.slice()).slice(0, 20).map(function (id) { return { id: id, dir: "f" }; }), "Học thêm: ôn tự do"); } }
    ];
  }
  function renderExtras() {
    var box = $("extraList"); box.innerHTML = "";
    extraSources().forEach(function (x) {
      var b = el("button", "extra"); b.type = "button"; b.disabled = x.n === 0;
      b.appendChild(el("b", "", x.title));
      b.appendChild(el("span", "d", x.desc));
      b.appendChild(el("span", "n", x.n === 0 ? "Chưa có" : x.n + " " + x.label));
      b.addEventListener("click", x.run);
      box.appendChild(b);
    });
  }

  /* ---------- danh sách từ (dùng cho Bộ TOEIC và Từ của tôi) ---------- */
  function wordRow(id, extraBtn) {
    var w = W(id), wrap = el("div", "wrow"), head = el("div", "whead"), st = stateOf(id);
    var main = el("button", "wmain"); main.type = "button"; main.setAttribute("aria-expanded", "false");
    main.appendChild(el("span", "ww", w.w));
    if (w.pos) main.appendChild(el("span", "wp", w.pos));
    main.appendChild(el("span", "wv", w.vi));
    var chip = el("span", "chip " + st, STATE_TXT[st]);
    head.appendChild(main); head.appendChild(chip);
    if (listenOn()) head.appendChild(spk(w.w, "Nghe " + w.w));
    wrap.appendChild(head);
    var detail = null;
    main.addEventListener("click", function () {
      if (detail) { detail.remove(); detail = null; main.setAttribute("aria-expanded", "false"); return; }
      detail = el("div", "wdetail");
      var w2 = W(id);
      if (w2.ex) { var r = el("div", "exrow"); r.appendChild(el("span", "ex", w2.ex)); if (listenOn()) r.appendChild(spk(w2.ex, "Nghe câu ví dụ", "ex")); detail.appendChild(r); }
      var xi = extraInfo(w2, true); if (xi) detail.appendChild(xi);
      detail.appendChild(sentenceBox(id));
      detail.appendChild(wordTools(id, false));
      if (extraBtn) detail.appendChild(extraBtn(id, wrap));
      wrap.appendChild(detail); main.setAttribute("aria-expanded", "true");
    });
    return wrap;
  }
  function matches(id, q) {
    var w = W(id);
    return w.w.toLowerCase().indexOf(q) >= 0 || w.vi.toLowerCase().indexOf(q) >= 0;
  }

  /* ---------- Bộ TOEIC theo mức ---------- */
  var openLessons = {}, openLevels = { 0: true };
  function lessonStats(a, b) {
    var seen = 0, known = 0;
    for (var i = a; i < b; i++) { var c = S.cards[TOEIC_IDS[i]]; if (c) { seen++; if (L.isKnown(c)) known++; } }
    return { seen: seen, known: known, n: b - a };
  }
  function drillIds(ids, title) {
    var q = [];
    ids.forEach(function (id) {
      q.push({ id: id, dir: "f" });
      if (S.cards[id + "|r"]) q.push({ id: id, dir: "r" });
    });
    startSession("extra", shuffle(q), title);
  }
  function drillLesson(i) {
    var r = L.lessonRange(i, TOEIC_N);
    drillIds(TOEIC_IDS.slice(r[0], r[1]), "Luyện bài " + (i + 1));
  }
  function drillTopic(t) { drillIds(L.pickTopic(TOPIC_IDS[t], S.cards, 20, shuffle), "Luyện chủ đề: " + TN.TOPICS[t]); }

  /* xem bộ TOEIC theo chủ đề: 12 chủ đề, trong mỗi chủ đề từ vẫn xếp từ thường gặp đến hiếm gặp */
  var toeicBy = "level", topicOpen = {}, topicShown = {};
  function renderTopics(box) {
    TN.TOPICS.forEach(function (name, t) {
      var ids = TOPIC_IDS[t], seen = 0;
      ids.forEach(function (id) { if (S.cards[id]) seen++; });
      var sec = el("section", "level"), h = el("button", "lvhead"); h.type = "button";
      h.setAttribute("aria-expanded", topicOpen[t] ? "true" : "false");
      h.appendChild(el("b", "", name));
      h.appendChild(el("span", "mini", ids.length + " từ · đã học " + seen + "/" + ids.length));
      var bar = el("div", "bar"), fill = el("i"); fill.style.width = Math.round(ids.length ? seen / ids.length * 100 : 0) + "%"; bar.appendChild(fill); h.appendChild(bar);
      h.addEventListener("click", function () { topicOpen[t] = !topicOpen[t]; renderToeic(); });
      sec.appendChild(h);
      if (topicOpen[t]) {
        var inner = el("div", "lesson"), top = el("div", "lhead");
        top.appendChild(el("span", "mini grow", "Xếp từ thường gặp đến hiếm gặp"));
        top.appendChild(btn("Luyện chủ đề này", "btn sm", function () { drillTopic(t); }));
        inner.appendChild(top);
        var shown = topicShown[t] || 40, list = el("div", "words");
        ids.slice(0, shown).forEach(function (id) { list.appendChild(wordRow(id)); });
        inner.appendChild(list);
        if (ids.length > shown) inner.appendChild(btn("Hiện thêm " + Math.min(40, ids.length - shown) + " từ", "btn sm more", function () { topicShown[t] = shown + 40; renderToeic(); }));
        sec.appendChild(inner);
      }
      box.appendChild(sec);
    });
  }
  $("toeicBy").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    toeicBy = b.getAttribute("data-by"); renderToeic();
  });

  function renderToeic() {
    var box = $("levels"), qtxt = $("tSearch").value.trim().toLowerCase(), byTopic = toeicBy === "topic" && HAS_X;
    box.innerHTML = "";
    $("toeicBy").hidden = !HAS_X;
    Array.prototype.forEach.call($("toeicBy").querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-by") === (byTopic ? "topic" : "level") ? "true" : "false"); });
    var seen = 0; TOEIC_IDS.forEach(function (id) { if (S.cards[id]) seen++; });
    $("tSummary").textContent = TOEIC_N + " từ, xếp từ thường gặp nhất đến hiếm gặp nhất, " + (byTopic ? "chia thành " + TN.TOPICS.length + " chủ đề" : "chia thành 5 mức và " + L.lessonCount(TOEIC_N) + " bài") + ". Đã học " + seen + " từ.";
    if (qtxt) {
      var hits = TOEIC_IDS.filter(function (id) { return matches(id, qtxt); });
      var list = el("div", "words");
      hits.slice(0, 60).forEach(function (id) { list.appendChild(wordRow(id)); });
      box.appendChild(el("p", "mini", hits.length ? "Tìm thấy " + hits.length + " từ" + (hits.length > 60 ? ", hiện 60 từ đầu" : "") + "." : "Không tìm thấy từ nào."));
      box.appendChild(list);
      return;
    }
    if (byTopic) { renderTopics(box); return; }
    LEVELS.forEach(function (lv, li) {
      var ls = lessonStats(lv.from, lv.to);
      var sec = el("section", "level"), h = el("button", "lvhead"); h.type = "button";
      h.setAttribute("aria-expanded", openLevels[li] ? "true" : "false");
      h.appendChild(el("b", "", "Mức " + lv.n + " · " + lv.name));
      h.appendChild(el("span", "mini", "Từ " + (lv.from + 1) + " đến " + lv.to + " · đã học " + ls.seen + "/" + ls.n));
      var bar = el("div", "bar"), fill = el("i"); fill.style.width = Math.round(ls.seen / ls.n * 100) + "%"; bar.appendChild(fill); h.appendChild(bar);
      h.addEventListener("click", function () { openLevels[li] = !openLevels[li]; renderToeic(); });
      sec.appendChild(h);
      if (openLevels[li]) {
        for (var i = lv.lessonFrom; i < lv.lessonTo; i++) sec.appendChild(lessonBlock(i));
      }
      box.appendChild(sec);
    });
  }
  function lessonBlock(i) {
    var r = L.lessonRange(i, TOEIC_N), ls = lessonStats(r[0], r[1]), blk = el("div", "lesson");
    var h = el("div", "lhead"), t = el("button", "ltitle"); t.type = "button"; t.setAttribute("aria-expanded", openLessons[i] ? "true" : "false");
    t.appendChild(el("b", "", "Bài " + (i + 1)));
    t.appendChild(el("span", "mini", ls.seen + "/" + ls.n + " đã học" + (ls.known ? " · " + ls.known + " thuộc" : "")));
    t.addEventListener("click", function () { openLessons[i] = !openLessons[i]; renderToeic(); });
    h.appendChild(t);
    h.appendChild(btn("Luyện bài này", "btn sm", function () { drillLesson(i); }));
    blk.appendChild(h);
    if (openLessons[i]) {
      var list = el("div", "words");
      for (var k = r[0]; k < r[1]; k++) list.appendChild(wordRow(TOEIC_IDS[k]));
      blk.appendChild(list);
    }
    return blk;
  }
  $("tSearch").addEventListener("input", renderToeic);

  /* ---------- Từ của tôi ---------- */
  function addCustom(o) {
    var id = "c:" + o.w.toLowerCase();
    if (BASE[id]) return "dup";
    if (BASE[o.w.toLowerCase()]) return "toeic";
    S.custom.push({ id: id, w: o.w, pos: o.pos || "", vi: o.vi, ex: o.ex || "", t: Date.now() });
    reindex();
    return "ok";
  }
  function setMsg(id, text, kind) { var m = $(id); m.textContent = text; m.setAttribute("data-k", kind || ""); }
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = $("wWord").value.trim(), m = $("wMean").value.trim();
    if (!w || !m) return;
    var r = addCustom({ w: w, pos: $("wPos").value.trim(), vi: m, ex: $("wEx").value.trim() });
    if (r === "ok") {
      var note = $("wNote").value.trim();
      if (note) S.notes["c:" + w.toLowerCase()] = note;
      store.save();
      setMsg("addMsg", "Đã thêm “" + w + "”. Từ này xuất hiện ở lượt học kế tiếp.", "ok");
      $("addForm").reset(); $("wWord").focus();
    } else setMsg("addMsg", r === "dup" ? "Từ này đã có trong danh sách của bạn." : "Từ này đã có trong bộ TOEIC, không cần thêm lại.", "bad");
    renderMine(); renderHome();
  });
  $("bulkForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var p = L.parseBulk($("bulk").value), added = 0, dup = 0;
    p.ok.forEach(function (x) { if (addCustom(x) === "ok") added++; else dup++; });
    if (added) store.save();
    var parts = ["Đã thêm " + added + " từ"];
    if (dup) parts.push(dup + " từ đã có nên bỏ qua");
    if (p.bad.length) parts.push(p.bad.length + " dòng thiếu nghĩa, chưa thêm: " + p.bad.slice(0, 3).join("; ") + (p.bad.length > 3 ? "…" : ""));
    setMsg("bulkMsg", parts.join(". ") + ".", added ? "ok" : "bad");
    if (!p.bad.length) $("bulk").value = "";
    renderMine(); renderHome();
  });
  function deleteBtn(id) {
    var b = btn("Xóa từ", "btn sm danger"), armed = false, timer = null;
    b.addEventListener("click", function () {
      if (!armed) {
        armed = true; b.textContent = "Bấm lại để xóa";
        timer = setTimeout(function () { armed = false; b.textContent = "Xóa từ"; }, 3000);
        return;
      }
      clearTimeout(timer);
      S.custom = S.custom.filter(function (c) { return c.id !== id; });
      delete S.cards[id]; delete S.cards[id + "|r"]; delete S.notes[id]; delete S.sentences[id];
      reindex(); store.save(); renderMine(); renderHome();
    });
    return b;
  }
  function renderMine() {
    var q = $("mySearch").value.trim().toLowerCase(), list = $("myList"); list.innerHTML = "";
    paintReader();
    $("myCount").textContent = CUSTOM_IDS.length ? "(" + CUSTOM_IDS.length + " từ)" : "";
    var ids = CUSTOM_IDS.slice().reverse().filter(function (id) { return !q || matches(id, q); });
    if (!ids.length) { list.appendChild(el("p", "mini", CUSTOM_IDS.length ? "Không có từ nào khớp." : "Chưa có từ nào. Thêm từ đầu tiên ở khung phía trên.")); return; }
    ids.forEach(function (id) { list.appendChild(wordRow(id, function (i) { return deleteBtn(i); })); });
  }
  $("mySearch").addEventListener("input", renderMine);

  /* ---------- đọc văn bản: bấm vào từ để xem nghĩa hoặc thêm vào Từ của tôi ---------- */
  var rdTokens = [];
  function lookupId(tok) {
    var c = L.candidates(tok);
    for (var i = 0; i < c.length; i++) {
      if (BASE[c[i]]) return c[i];
      if (BASE["c:" + c[i]]) return "c:" + c[i];
    }
    return null;
  }
  function paintReader() {
    rdTokens.forEach(function (t) {
      var id = lookupId(t.s), cls = "rw" + (id ? (BASE[id].src === "t" ? " rt" : " rc") : "") + (t.b.classList.contains("on") ? " on" : "");
      t.b.className = cls;
    });
  }
  function readerStats() {
    var seen = {}, tt = 0, cc = 0, none = 0;
    rdTokens.forEach(function (t) {
      var k = t.s.toLowerCase(); if (seen[k]) return; seen[k] = 1;
      var id = lookupId(t.s);
      if (!id) none++; else if (BASE[id].src === "t") tt++; else cc++;
    });
    var all = tt + cc + none;
    $("rdStat").textContent = all ? all + " từ khác nhau: " + tt + " thuộc bộ TOEIC, " + cc + " trong danh sách của bạn, " + none + " chưa có. Bấm vào một từ để xem nghĩa." : "Không thấy từ tiếng Anh nào trong đoạn này.";
  }
  function readerInfo(t) {
    var box = $("rdInfo"), id = lookupId(t.s);
    box.innerHTML = ""; box.hidden = false;
    rdTokens.forEach(function (x) { x.b.classList.toggle("on", x === t); });
    var head = el("div", "rdhead");
    if (id) {
      var w = W(id), st = stateOf(id);
      head.appendChild(el("b", "", w.w));
      if (w.pos) head.appendChild(el("span", "wp", w.pos));
      head.appendChild(el("span", "chip " + st, STATE_TXT[st]));
      if (listenOn()) head.appendChild(spk(w.w, "Nghe " + w.w));
      box.appendChild(head);
      if (t.s.toLowerCase() !== w.w.toLowerCase()) box.appendChild(el("p", "mini", "Trong bài: “" + t.s + "”, dạng chia của " + w.w + "."));
      box.appendChild(el("p", "rdmean", w.vi));
      if (w.ex) box.appendChild(el("p", "mini", "Ví dụ: " + w.ex));
      var xi = extraInfo(w, false); if (xi) box.appendChild(xi);
      var row = el("div", "row-btns");
      row.appendChild(btn("Học từ này ngay", "btn sm", function () { drillIds([id], "Học: " + w.w); }));
      box.appendChild(row);
      return;
    }
    head.appendChild(el("b", "", t.s));
    head.appendChild(el("span", "chip new", "Chưa có"));
    if (listenOn()) head.appendChild(spk(t.s, "Nghe " + t.s));
    box.appendChild(head);
    box.appendChild(el("p", "mini", "Từ này chưa có trong bộ của bạn. Điền nghĩa rồi thêm vào Từ của tôi."));
    var f = el("form", "addf"), two = el("div", "two"), wd = el("input"), pos = el("input"), vi = el("input"), ex = el("input"), msg = el("p", "msg");
    wd.value = L.candidates(t.s)[0]; wd.setAttribute("aria-label", "Từ tiếng Anh"); wd.required = true;
    pos.placeholder = "loại"; pos.setAttribute("aria-label", "Loại từ");
    vi.placeholder = "Nghĩa tiếng Việt"; vi.setAttribute("aria-label", "Nghĩa tiếng Việt"); vi.required = true;
    ex.value = L.sentenceAt(rdText, t.i); ex.setAttribute("aria-label", "Câu ví dụ");
    two.appendChild(wd); two.appendChild(pos);
    f.appendChild(two); f.appendChild(vi); f.appendChild(ex);
    var acts = el("div", "row-btns"), add = el("button", "btn pri", "Thêm vào Từ của tôi"), look = el("a", "btn sm", "Tra nghĩa (Cambridge)");
    add.type = "submit";
    look.href = "https://dictionary.cambridge.org/dictionary/english-vietnamese/" + encodeURIComponent(L.candidates(t.s)[0]);
    look.target = "_blank"; look.rel = "noopener noreferrer";
    acts.appendChild(add); acts.appendChild(look); f.appendChild(acts); f.appendChild(msg);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var w2 = wd.value.trim(), m = vi.value.trim();
      if (!w2 || !m) return;
      var r = addCustom({ w: w2, pos: pos.value.trim(), vi: m, ex: ex.value.trim() });
      if (r === "ok") { store.save(); renderMine(); renderHome(); readerStats(); readerInfo(t); }
      else { msg.textContent = r === "dup" ? "Từ này đã có trong danh sách của bạn." : "Từ này đã có trong bộ TOEIC."; msg.setAttribute("data-k", "bad"); }
    });
    box.appendChild(f);
    vi.focus();
  }
  var rdText = "";
  function renderReader() {
    rdText = $("rdText").value.slice(0, 8000);
    var body = $("rdBody"); body.innerHTML = ""; rdTokens = [];
    $("rdInfo").hidden = true; $("rdInfo").innerHTML = "";
    if (!rdText.trim()) { $("rdOut").hidden = true; return; }
    L.tokenize(rdText).forEach(function (t) {
      if (!t.w) {
        var nl = (t.s.match(/\n/g) || []).length;
        if (nl) { for (var k = 0; k < Math.min(nl, 2); k++) body.appendChild(document.createElement("br")); }
        else body.appendChild(document.createTextNode(t.s));
        return;
      }
      var b = el("button", "rw", t.s); b.type = "button";
      var rec = { s: t.s, i: t.i, b: b };
      b.addEventListener("click", function () { readerInfo(rec); });
      rdTokens.push(rec); body.appendChild(b);
    });
    $("rdOut").hidden = false; paintReader(); readerStats();
  }
  $("rdForm").addEventListener("submit", function (e) { e.preventDefault(); renderReader(); });
  $("rdClear").addEventListener("click", function () { $("rdText").value = ""; renderReader(); $("rdText").focus(); });

  /* ---------- cài đặt ---------- */
  function renderSettings() {
    $("setNew").value = S.newPerDay;
    var sl = $("setLevel");
    if (!sl.options.length) LEVELS.forEach(function (lv) { var o = el("option", "", "Mức " + lv.n + " · " + lv.name); o.value = lv.n; sl.appendChild(o); });
    sl.value = String(S.startLevel);
    $("setMode").value = S.mode; $("setRet").value = String(S.retention);
    $("setListen").checked = S.listen; $("setAuto").checked = S.autoplay;
    $("setAccent").value = S.accent; $("setSpeed").value = String(S.speed === 1 ? 1 : 0.7);
    var note = "";
    if (!tts.available()) note = "Trình duyệt này không hỗ trợ giọng đọc, nên các bài nghe tự tắt. Thử Chrome, Edge hoặc Safari.";
    else if (!tts.hasEnglishVoice()) note = "Thiết bị chưa báo có giọng đọc tiếng Anh. Bấm nghe thử: nếu không có tiếng, hãy cài giọng tiếng Anh trong cài đặt hệ thống.";
    $("voiceNote").textContent = note;
  }
  function bindSetting(id, fn) { $(id).addEventListener("change", function () { fn($(id)); store.save(); Q_refresh(); }); }
  function Q_refresh() { item = null; renderHome(); }
  bindSetting("setNew", function (i) { S.newPerDay = Math.max(1, Math.min(50, parseInt(i.value, 10) || 10)); i.value = S.newPerDay; });
  bindSetting("setLevel", function (i) { S.startLevel = parseInt(i.value, 10) || 1; });
  bindSetting("setMode", function (i) { S.mode = i.value; });
  bindSetting("setRet", function (i) { S.retention = parseFloat(i.value) || 0.9; });
  bindSetting("setListen", function (i) { S.listen = i.checked; });
  bindSetting("setAuto", function (i) { S.autoplay = i.checked; });
  bindSetting("setAccent", function (i) { S.accent = i.value; });
  bindSetting("setSpeed", function (i) { S.speed = parseFloat(i.value) || 1; });
  $("testVoice").addEventListener("click", function () {
    if (!say("Good morning. Please confirm your reservation before the meeting.")) $("voiceNote").textContent = "Không phát được âm thanh trên trình duyệt này.";
  });

  /* ---------- trang chủ: các nút ---------- */
  $("goStudy").addEventListener("click", function () {
    if ($("goStudy").getAttribute("data-go") === "extra") go("hoc-them"); else startDaily();
  });
  $("goLeech").addEventListener("click", function () { go("hoc-them"); });

  /* ---------- các mục (đường dẫn #hash) ---------- */
  var VIEWS = ["hom-nay", "hoc", "hoc-them", "toeic", "cua-toi", "cai-dat"], TABS = ["hom-nay", "hoc-them", "toeic", "cua-toi", "cai-dat"];
  function showView() {
    var h = (location.hash || "").replace("#", "");
    if (VIEWS.indexOf(h) < 0) h = "hom-nay";
    if (h === "hoc" && !sess) h = "hom-nay";
    VIEWS.forEach(function (v) { $("v-" + v).hidden = v !== h; });
    var tabOn = h === "hoc" ? "hom-nay" : h;
    TABS.forEach(function (v) {
      var t = $("t-" + v), on = v === tabOn;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    if (h === "hom-nay") { checkTasks(); renderHome(); renderStreak(); }
    else if (h === "hoc") renderSession();
    else if (h === "hoc-them") renderExtras();
    else if (h === "toeic") renderToeic();
    else if (h === "cua-toi") renderMine();
    else if (h === "cai-dat") renderSettings();
    if (h !== "hoc") tts.stop();
  }
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(b.getAttribute("data-v")); });
  $("tabs").addEventListener("keydown", function (e) {
    var cur = document.activeElement && document.activeElement.getAttribute("data-v"), i = TABS.indexOf(cur);
    if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    var n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    go(n); $("t-" + n).focus();
  });
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").replace("#", "");
    if (pendingHash !== null && h === pendingHash) { pendingHash = null; return; }
    pendingHash = null; showView();
  });

  /* ---------- vẽ lại tất cả ---------- */
  function renderAll() { checkTasks(); renderHome(); renderStreak(); showView(); }

  // sang ngày mới khi để trang mở qua đêm
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || $("appView").hidden) return;
    var d = srs.dayNum();
    if (d !== curDay) { curDay = d; sess = null; item = null; cheering = false; renderAll(); }
  });

  /* ---------- vào / ra ứng dụng ---------- */
  function enterApp(user) {
    if (currentUser && user && currentUser === user.id) return;
    currentUser = user ? user.id : "local";
    ready = !user;
    store.start(client, user ? user.id : null);
    reindex();
    $("acctEmail").textContent = user ? user.email || "" : "";
    $("signout").hidden = !user;
    $("localnote").hidden = !!user;
    curDay = srs.dayNum(); sess = null; item = null; cheering = false;
    if (location.hash === "#hoc") location.hash = "hom-nay";
    renderAll(); showScreen("appView");
  }
  function leaveApp() { currentUser = null; store.stop(); showScreen("authView"); }

  /* ---------- đăng nhập ---------- */
  var mode = "login";
  function msg(id, text, kind) { var m = $(id); m.textContent = text || ""; m.setAttribute("data-k", kind || ""); }
  function viError(err) {
    var t = ((err && err.message) || "").toLowerCase();
    if (t.indexOf("invalid login") >= 0) return "Sai email hoặc mật khẩu.";
    if (t.indexOf("not confirmed") >= 0) return "Email chưa được xác nhận. Mở email và bấm liên kết xác nhận.";
    if (t.indexOf("already registered") >= 0) return "Email này đã có tài khoản. Hãy đăng nhập.";
    if (t.indexOf("rate limit") >= 0 || t.indexOf("too many") >= 0) return "Thử quá nhiều lần. Đợi vài phút rồi thử lại.";
    if (t.indexOf("password") >= 0) return "Mật khẩu chưa đạt yêu cầu. Dùng ít nhất 8 ký tự.";
    if (t.indexOf("fetch") >= 0 || t.indexOf("network") >= 0) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    return "Có lỗi xảy ra: " + (err && err.message ? err.message : "không rõ nguyên nhân");
  }
  function redirectUrl() { return location.origin + location.pathname; }
  function setMode(m) {
    mode = m;
    $("mLogin").setAttribute("aria-selected", m === "login" ? "true" : "false");
    $("mSignup").setAttribute("aria-selected", m === "signup" ? "true" : "false");
    $("aSubmit").textContent = m === "login" ? "Đăng nhập" : "Tạo tài khoản";
    $("aPass").setAttribute("autocomplete", m === "login" ? "current-password" : "new-password");
    $("aForgot").hidden = m !== "login";
    msg("aMsg", "");
  }
  function busy(b) { $("aSubmit").disabled = b; $("rSubmit").disabled = b; }

  function initAuth() {
    $("mLogin").addEventListener("click", function () { setMode("login"); });
    $("mSignup").addEventListener("click", function () { setMode("signup"); });
    $("authForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("aEmail").value.trim(), pw = $("aPass").value;
      if (!email) { msg("aMsg", "Nhập email của bạn.", "bad"); return; }
      if (pw.length < 8) { msg("aMsg", "Mật khẩu cần ít nhất 8 ký tự.", "bad"); return; }
      busy(true); msg("aMsg", "");
      var p = mode === "login"
        ? client.auth.signInWithPassword({ email: email, password: pw })
        : client.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: redirectUrl() } });
      p.then(function (res) {
        busy(false);
        if (res.error) { msg("aMsg", viError(res.error), "bad"); return; }
        if (mode === "signup" && !(res.data && res.data.session)) {
          msg("aMsg", "Đã gửi email xác nhận. Mở email, bấm liên kết, rồi quay lại đăng nhập.", "ok");
        }
      }, function () { busy(false); msg("aMsg", "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", "bad"); });
    });
    $("aForgot").addEventListener("click", function () {
      var email = $("aEmail").value.trim();
      if (!email) { msg("aMsg", "Nhập email vào ô trên, rồi bấm Quên mật khẩu.", "bad"); return; }
      client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() }).then(function (res) {
        if (res.error) msg("aMsg", viError(res.error), "bad");
        else msg("aMsg", "Đã gửi email đặt lại mật khẩu (nếu email này có tài khoản).", "ok");
      }, function () { msg("aMsg", "Không kết nối được máy chủ.", "bad"); });
    });
    $("recForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = $("rPass").value;
      if (pw.length < 8) { msg("rMsg", "Mật khẩu cần ít nhất 8 ký tự.", "bad"); return; }
      busy(true);
      client.auth.updateUser({ password: pw }).then(function (res) {
        busy(false);
        if (res.error) { msg("rMsg", viError(res.error), "bad"); return; }
        recovering = false;
        $("rPass").value = "";
        enterApp(res.data.user);
      }, function () { busy(false); msg("rMsg", "Không kết nối được máy chủ.", "bad"); });
    });
    $("signout").addEventListener("click", function () {
      $("signout").disabled = true;
      store.flush().then(function () { return client.auth.signOut(); }).then(function () { $("signout").disabled = false; });
    });
  }

  /* ---------- khởi động ---------- */
  function boot() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
      enterApp(null); // chế độ chỉ lưu trên máy này
      if (cfg.SUPABASE_URL && !window.supabase) {
        $("localnote").textContent = "Không tải được thư viện đăng nhập. Kiểm tra mạng rồi tải lại trang. Tiến độ tạm thời chỉ lưu trên trình duyệt này.";
      }
      return;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    initAuth();
    setMode("login");
    client.auth.onAuthStateChange(function (event, session) {
      // không gọi truy vấn Supabase ngay trong hàm này, nên hoãn sang lượt sau
      setTimeout(function () {
        if (event === "PASSWORD_RECOVERY") { recovering = true; store.stop(); currentUser = null; showScreen("recoverView"); return; }
        if (recovering) { showScreen("recoverView"); return; }
        if (session && session.user) enterApp(session.user);
        else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") leaveApp();
      }, 0);
    });
  }
  boot();
})();
