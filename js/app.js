/* Giao diện: đăng nhập, 4 mục, chuỗi ngày, ôn từ vựng nhiều dạng, Part 5, việc hôm nay. */
(function () {
  "use strict";
  var TN = window.TN, D = TN.data, store = TN.store, srs = TN.srs, L = TN.logic, S = store.state;
  var cfg = window.TN_CONFIG || {};
  var recovering = /type=recovery/.test(location.hash); // đọc trước khi thư viện xóa #hash
  var NEW_PER_DAY = 10;
  var VOCAB = D.VOCAB, QUIZ = D.QUIZ, TASKS = D.TASKS, PARTS = D.PARTS;
  var MODES = { auto: 1, flip: 1, mc: 1, cloze: 1, type: 1 };
  var client = null, currentUser = null, Q = [], item = null, curDay = srs.dayNum(), cheering = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function today() { return L.dayKey(new Date()); }
  function dayChecks(k) { var a = S.checks[k]; return Array.isArray(a) ? a : []; }
  function allWords() { return VOCAB.concat(S.custom); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
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
  });
  store.onAdopt(function () { Q = buildQueue(); item = null; renderAll(); });

  /* ---------- nhiệm vụ hôm nay và chuỗi ngày ---------- */
  function setTask(i, val) {
    var k = today(), a = TASKS.map(function (_, j) { return !!dayChecks(k)[j]; });
    if (a[i] === val) return;
    var wasDone = L.streakStats(S.checks, k, TASKS.length).doneToday;
    a[i] = val; S.checks[k] = a; store.save();
    var now = L.streakStats(S.checks, k, TASKS.length).doneToday;
    if (!wasDone && now) { cheering = true; burst(); } else if (!now) cheering = false;
    syncTodo(); renderStreak();
  }
  function syncTodo() {
    var a = dayChecks(today());
    TASKS.forEach(function (_, i) { var cb = $("task" + i); if (cb) cb.checked = !!a[i]; });
  }
  function renderTodo() {
    var ul = $("todo"); ul.innerHTML = "";
    TASKS.forEach(function (t, i) {
      var li = el("li"), lb = el("label"), cb = el("input"), sp = el("span", "", t);
      cb.type = "checkbox"; cb.id = "task" + i;
      cb.addEventListener("change", function () { setTask(i, cb.checked); });
      lb.appendChild(cb); lb.appendChild(sp); li.appendChild(lb); ul.appendChild(li);
    });
    var d = new Date(), names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    $("today").textContent = names[d.getDay()] + ", " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
    syncTodo();
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
        ? "Còn " + left + " nhiệm vụ hôm nay để giữ chuỗi " + s.current + " ngày. Bỏ lỡ một ngày là chuỗi về 0."
        : s.doneCount > 0
          ? "Còn " + left + " nhiệm vụ nữa để bắt đầu chuỗi."
          : "Hoàn thành cả " + n + " nhiệm vụ hôm nay để bắt đầu chuỗi.";
    $("cheer").hidden = !cheering;
    renderWeek();
    renderStats();
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
    var box = $("confetti"), cols = ["var(--flame)", "var(--flame-2)", "var(--accent)", "var(--ink)"];
    box.innerHTML = "";
    for (var i = 0; i < 24; i++) {
      var s = el("span"), a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 110;
      s.style.setProperty("--dx", Math.round(Math.cos(a) * r) + "px");
      s.style.setProperty("--dy", Math.round(Math.sin(a) * r - 40) + "px");
      s.style.setProperty("--rot", Math.round(Math.random() * 540) + "deg");
      s.style.background = cols[i % cols.length];
      box.appendChild(s);
    }
    var f = $("flame"); f.classList.remove("pop"); void f.offsetWidth; f.classList.add("pop");
  }
  function renderStats() {
    $("sDue").textContent = Q.length;
    $("sQuiz").textContent = S.quizBest === null ? "–" : S.quizBest + "/" + QUIZ.length;
    var bd = $("dueBadge"); bd.textContent = Q.length; bd.hidden = Q.length === 0;
    $("goTxt").textContent = Q.length ? "Có " + Q.length + " thẻ cần ôn hôm nay." : "Hôm nay bạn đã ôn xong. Thẻ mới hiện khi đến hạn.";
  }

  /* ---------- hàng đợi ôn tập ---------- */
  function buildQueue() {
    var t = srs.dayNum(), due = [], news = [];
    allWords().forEach(function (w) {
      var c = S.cards[w[0]];
      if (!c) news.push(w); else if (c.due <= t) due.push([c.due, w]);
    });
    due.sort(function (a, b) { return a[0] - b[0]; });
    var used = S.newDay === t ? S.newCount : 0, room = Math.max(0, NEW_PER_DAY - used);
    return due.map(function (x) { return x[1]; }).concat(news.slice(0, room));
  }
  function dayLabel(n) { var d = new Date(n * 86400000); return d.getUTCDate() + "/" + (d.getUTCMonth() + 1); }
  function ivText(n) { return n === 0 ? "học lại" : n + " ngày"; }

  function applyRating(w, r) {
    var t = srs.dayNum(), c = S.cards[w[0]];
    if (!c) {
      c = srs.fresh();
      if (S.newDay === t) S.newCount++; else { S.newDay = t; S.newCount = 1; }
    }
    S.cards[w[0]] = srs.schedule(c, r);
    store.save();
  }
  function advance(bad) {
    if (bad) { if (Q.length > 1) Q.push(Q.shift()); } else Q.shift();
    item = null;
    if (Q.length === 0) setTask(0, true); // ôn hết thẻ đến hạn thì nhiệm vụ 1 tự hoàn thành
  }

  /* ---------- tạo bài cho một thẻ ---------- */
  function distract(w, n) {
    var pool = allWords().filter(function (x) { return x[0] !== w[0]; });
    var same = shuffle(pool.filter(function (x) { return x[1] === w[1]; }));
    var rest = shuffle(pool.filter(function (x) { return x[1] !== w[1]; }));
    return same.concat(rest).slice(0, n);
  }
  function makeItem(w) {
    var c = S.cards[w[0]], cz = L.cloze(w[0], w[3]);
    var kind = L.kindFor(MODES[S.mode] ? S.mode : "auto", c, !!cz);
    var it = { w: w, kind: kind, done: false, ok: null, flip: false, cz: cz };
    if (kind === "mc" || kind === "cloze") it.opts = shuffle([w].concat(distract(w, 3)));
    if (kind === "mc") it.rev = !!(c && c.reps % 2 === 1); // chiều ngược: nghĩa -> từ
    return it;
  }

  /* ---------- vẽ khu vực ôn từ ---------- */
  function renderVocab() {
    var t = srs.dayNum(), words = allWords(), learning = 0, known = 0, news = 0;
    words.forEach(function (w) {
      var c = S.cards[w[0]];
      if (!c) news++; else if (c.iv >= 21) known++; else learning++;
    });
    $("sKnown").textContent = known;
    var box = $("srsStats"); box.innerHTML = "";
    [["Cần ôn", Q.length], ["Chưa học", news], ["Đang học", learning], ["Đã thuộc", known]].forEach(function (x) {
      var d = el("div"), b = el("b", "", x[1]);
      d.appendChild(b); d.appendChild(el("span", "", x[0])); box.appendChild(d);
    });
    $("mode").value = MODES[S.mode] ? S.mode : "auto";
    var st = $("study"); st.innerHTML = "";
    if (Q.length === 0) {
      item = null;
      var next = null;
      words.forEach(function (w) { var c = S.cards[w[0]]; if (c && c.due > t && (next === null || c.due < next)) next = c.due; });
      var done = el("div", "prompt");
      done.appendChild(el("div", "big", "Xong hôm nay"));
      done.appendChild(el("div", "ex", next !== null
        ? "Thẻ tiếp theo đến hạn ngày " + dayLabel(next) + "."
        : news > 0 ? "Bạn đã học đủ " + NEW_PER_DAY + " từ mới hôm nay. Mai học tiếp." : "Chưa có thẻ nào."));
      st.appendChild(done);
      $("keys").textContent = "";
      renderStats();
      return;
    }
    if (!item || item.w !== Q[0]) item = makeItem(Q[0]);
    if (item.kind === "flip") drawFlip(st);
    else if (item.kind === "type") drawType(st);
    else drawChoice(st);
    renderStats();
  }

  function drawFlip(st) {
    var w = item.w, card = el("button", "card"), rt = el("div", "rate");
    card.type = "button";
    if (!item.flip) {
      card.appendChild(el("div", "w", w[0]));
      card.appendChild(el("div", "pos", w[1] ? "(" + w[1] + ")" : ""));
      card.appendChild(el("div", "hint", "Từ mới. Chạm hoặc nhấn Space để lật thẻ"));
    } else {
      card.appendChild(el("div", "w", w[0]));
      card.appendChild(el("div", "mean", w[2]));
      card.appendChild(el("div", "ex", w[3] || ""));
    }
    card.addEventListener("click", function () { item.flip = !item.flip; renderVocab(); });
    var c = S.cards[w[0]] || srs.fresh();
    ["Quên", "Khó", "Tốt", "Dễ"].forEach(function (name, r) {
      var b = el("button", "r" + r, name); b.type = "button"; b.disabled = !item.flip;
      b.appendChild(el("small", "", item.flip ? ivText(srs.schedule(c, r).iv) : ""));
      b.addEventListener("click", function () { rate(r); });
      rt.appendChild(b);
    });
    st.appendChild(card); st.appendChild(rt);
    $("keys").textContent = "Phím tắt: Space lật thẻ · 1 Quên · 2 Khó · 3 Tốt · 4 Dễ";
  }
  function rate(r) {
    if (!item || item.kind !== "flip" || !item.flip) return;
    applyRating(item.w, r);
    advance(r === 0);
    renderVocab();
  }

  function promptBox(label) {
    var p = el("div", "prompt");
    p.appendChild(el("div", "lab", label));
    return p;
  }
  function drawChoice(st) {
    var w = item.w, mc = item.kind === "mc", p;
    if (mc) {
      p = promptBox(item.rev ? "Chọn từ tiếng Anh đúng" : "Chọn nghĩa đúng");
      p.appendChild(el("div", "big", item.rev ? w[2] : w[0]));
      if (!item.rev && w[1]) p.appendChild(el("div", "pos", "(" + w[1] + ")"));
    } else {
      p = promptBox("Điền từ vào chỗ trống (có thể cần chia dạng)");
      p.appendChild(el("div", "cz", item.cz.text));
    }
    var opts = el("div", "opts");
    item.opts.forEach(function (o, i) {
      var b = el("button", "opt"); b.type = "button";
      b.appendChild(el("span", "b", "ABCD".charAt(i)));
      b.appendChild(el("span", "t", mc && !item.rev ? o[2] : o[0]));
      if (item.done) {
        b.disabled = true;
        if (o === item.w) b.classList.add("right");
        else if (i === item.pick) b.classList.add("wrong");
      }
      b.addEventListener("click", function () { choose(i); });
      opts.appendChild(b);
    });
    st.appendChild(p); st.appendChild(opts);
    if (item.done) drawFeedback(st);
    $("keys").textContent = item.done ? "Enter sang bài tiếp" : "Phím 1 đến 4 chọn đáp án";
  }
  function choose(i) {
    if (!item || item.done) return;
    item.done = true; item.pick = i; item.ok = item.opts[i] === item.w;
    finish();
  }

  function drawType(st) {
    var w = item.w;
    var p = promptBox("Gõ từ tiếng Anh có nghĩa");
    p.appendChild(el("div", "big", w[2]));
    if (w[1]) p.appendChild(el("div", "pos", "(" + w[1] + ")"));
    if (item.cz) p.appendChild(el("div", "cz", item.cz.text));
    p.appendChild(el("div", "pos", "Bắt đầu bằng “" + w[0].charAt(0) + "”, " + w[0].length + " ký tự"));
    var f = el("form", "tyform"), inp = el("input"), go = el("button", "btn pri", "Kiểm tra");
    inp.id = "tyIn"; inp.type = "text"; inp.autocomplete = "off"; inp.autocapitalize = "none"; inp.spellcheck = false;
    inp.setAttribute("aria-label", "Từ tiếng Anh"); go.type = "submit";
    if (item.done) { inp.value = item.ans; inp.disabled = true; inp.classList.add(item.ok ? "ok" : "bad"); go.hidden = true; }
    f.appendChild(inp); f.appendChild(go);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (item.done) return;
      var ans = inp.value.trim().toLowerCase();
      if (!ans) return;
      var good = [w[0].toLowerCase()];
      if (item.cz) good.push(item.cz.surface.toLowerCase());
      item.done = true; item.ans = inp.value.trim(); item.ok = good.indexOf(ans) >= 0;
      finish();
    });
    st.appendChild(p); st.appendChild(f);
    if (item.done) drawFeedback(st);
    $("keys").textContent = item.done ? "Enter sang bài tiếp" : "Gõ từ rồi nhấn Enter";
  }

  function finish() {
    applyRating(item.w, item.ok ? 2 : 0);
    item.iv = S.cards[item.w[0]].iv;
    renderVocab();
    var nx = $("study").querySelector(".next");
    if (nx) nx.focus();
  }
  function drawFeedback(st) {
    var w = item.w, fb = el("div", "fb " + (item.ok ? "ok" : "bad"));
    fb.appendChild(el("b", "res", item.ok ? "Đúng." : "Chưa đúng."));
    fb.appendChild(el("span", "", w[0] + (w[1] ? " (" + w[1] + ")" : "") + ": " + w[2]));
    if (w[3]) fb.appendChild(el("span", "ex", w[3]));
    fb.appendChild(el("span", "iv", item.iv > 0 ? "Gặp lại sau " + item.iv + " ngày." : "Sẽ gặp lại trong lượt này."));
    var nx = el("button", "btn pri next", "Tiếp"); nx.type = "button";
    nx.addEventListener("click", function () { advance(item.ok === false); renderVocab(); });
    st.appendChild(fb); st.appendChild(nx);
  }

  $("mode").addEventListener("change", function () {
    if (item && item.done) advance(item.ok === false); // bài đã chấm xong thì sang thẻ kế rồi mới đổi kiểu
    S.mode = $("mode").value; store.save(); item = null; renderVocab();
  });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($("appView").hidden || $("v-tu-vung").hidden || !item) return;
    var n = e.key >= "1" && e.key <= "4" ? parseInt(e.key, 10) - 1 : -1;
    if (item.kind === "flip") {
      if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); item.flip = !item.flip; renderVocab(); }
      else if (n >= 0) rate(n);
    } else if (item.done) {
      if ((e.key === "Enter" || e.key === " ") && tag !== "BUTTON") { e.preventDefault(); advance(item.ok === false); renderVocab(); }
    } else if (item.kind !== "type" && n >= 0 && n < item.opts.length) choose(n);
  });
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = $("wWord").value.trim(), m = $("wMean").value.trim();
    if (!w || !m) return;
    var exists = allWords().some(function (x) { return x[0].toLowerCase() === w.toLowerCase(); });
    if (!exists) {
      S.custom.push([w, $("wPos").value.trim(), m, $("wEx").value.trim()]);
      store.save(); Q = buildQueue(); item = null; renderVocab();
    }
    $("addForm").reset();
  });

  /* ---------- mục tiêu ---------- */
  function level(v) {
    if (v >= 860) return "Thành thạo, đủ cho vị trí quản lý và đối ngoại";
    if (v >= 730) return "Làm việc tốt trong môi trường quốc tế";
    if (v >= 550) return "Giao tiếp công việc cơ bản";
    if (v >= 400) return "Sơ trung cấp";
    return "Nền tảng";
  }
  var tg = $("target");
  function showTarget() { tg.value = S.target; $("lvl").textContent = level(S.target); }
  tg.addEventListener("change", function () {
    S.target = Math.max(10, Math.min(990, parseInt(tg.value, 10) || 650));
    showTarget(); store.save();
  });

  /* ---------- Part 5 ---------- */
  var answered = {};
  function renderQuiz() {
    var box = $("quiz"); box.innerHTML = ""; answered = {};
    QUIZ.forEach(function (q, qi) {
      var wrap = el("div", "q"), p = el("p"), n = el("span", "n", 101 + qi);
      p.appendChild(n); p.appendChild(document.createTextNode(q[0])); wrap.appendChild(p);
      var o = el("div", "opts"), why = el("p", "why"); why.hidden = true;
      q[1].forEach(function (t, oi) {
        var b = el("button", "opt"); b.type = "button";
        b.appendChild(el("span", "b", "ABCD".charAt(oi))); b.appendChild(el("span", "t", t));
        b.addEventListener("click", function () {
          if (answered[qi] !== undefined) return;
          answered[qi] = oi;
          var all = o.querySelectorAll(".opt");
          for (var j = 0; j < all.length; j++) { all[j].disabled = true; if (j === q[2]) all[j].classList.add("right"); }
          if (oi !== q[2]) b.classList.add("wrong");
          why.textContent = (oi === q[2] ? "Đúng. " : "Chưa đúng. Đáp án là " + "ABCD".charAt(q[2]) + ". ") + q[3];
          why.hidden = false; updateScore();
        });
        o.appendChild(b);
      });
      wrap.appendChild(o); wrap.appendChild(why); box.appendChild(wrap);
    });
    updateScore();
  }
  function updateScore() {
    var total = Object.keys(answered).length, right = 0;
    QUIZ.forEach(function (q, i) { if (answered[i] === q[2]) right++; });
    $("qscore").textContent = total === 0 ? "Chưa làm câu nào" : "Đúng " + right + "/" + QUIZ.length + " · Đã làm " + total + "/" + QUIZ.length;
    if (total === QUIZ.length) {
      if (S.quizBest === null || right > S.quizBest) { S.quizBest = right; store.save(); }
      renderStats();
      setTask(1, true); // làm xong Part 5 thì nhiệm vụ 2 tự hoàn thành
    }
  }
  $("qreset").addEventListener("click", renderQuiz);

  /* ---------- bảng cấu trúc ---------- */
  PARTS.forEach(function (r) {
    var tr = el("tr");
    r.forEach(function (c, i) {
      var td = el("td");
      if (i === 0 || i === 2) td.className = "num";
      if (i === 4) td.className = "tip";
      if (i === 1) td.appendChild(el("span", "tag", c)); else td.textContent = c;
      tr.appendChild(td);
    });
    $("parts").appendChild(tr);
  });

  /* ---------- các mục (đường dẫn #hash) ---------- */
  var VIEWS = ["hom-nay", "tu-vung", "luyen-de", "bai-thi"];
  function showView() {
    var h = (location.hash || "").replace("#", "");
    if (VIEWS.indexOf(h) < 0) h = "hom-nay";
    VIEWS.forEach(function (v) {
      var on = v === h, t = $("t-" + v);
      $("v-" + v).hidden = !on;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
  }
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { location.hash = b.getAttribute("data-v"); showView(); } });
  $("tabs").addEventListener("keydown", function (e) {
    var cur = document.activeElement && document.activeElement.getAttribute("data-v"), i = VIEWS.indexOf(cur);
    if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    var n = VIEWS[(i + (e.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length];
    location.hash = n; showView(); $("t-" + n).focus();
  });
  $("goVocab").addEventListener("click", function () { location.hash = "tu-vung"; showView(); });
  window.addEventListener("hashchange", showView);

  /* ---------- vẽ lại tất cả ---------- */
  function renderAll() { showTarget(); renderTodo(); renderVocab(); renderStreak(); }

  // sang ngày mới khi để trang mở qua đêm
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || $("appView").hidden) return;
    var d = srs.dayNum();
    if (d !== curDay) { curDay = d; Q = buildQueue(); item = null; cheering = false; renderAll(); }
  });

  /* ---------- vào / ra ứng dụng ---------- */
  function enterApp(user) {
    if (currentUser && user && currentUser === user.id) return;
    currentUser = user ? user.id : "local";
    store.start(client, user ? user.id : null);
    $("acctEmail").textContent = user ? user.email || "" : "";
    $("signout").hidden = !user;
    $("localnote").hidden = !!user;
    curDay = srs.dayNum(); Q = buildQueue(); item = null; cheering = false;
    renderAll(); showView(); showScreen("appView");
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
    renderQuiz();
    showView();
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
