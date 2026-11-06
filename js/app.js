/* Giao diện: đăng nhập, 4 mục, ôn từ vựng, Part 5, việc hôm nay. */
(function () {
  "use strict";
  var TN = window.TN, D = TN.data, store = TN.store, srs = TN.srs, S = store.state;
  var cfg = window.TN_CONFIG || {};
  var recovering = /type=recovery/.test(location.hash); // đọc trước khi thư viện xóa #hash
  var NEW_PER_DAY = 10;
  var VOCAB = D.VOCAB, QUIZ = D.QUIZ, TASKS = D.TASKS, PARTS = D.PARTS;
  var client = null, currentUser = null, Q = [], flipped = false, curDay = srs.dayNum();

  function $(id) { return document.getElementById(id); }
  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function dayChecks(k) { var a = S.checks[k]; return Array.isArray(a) ? a : [false, false, false, false]; }
  function done(a) { return a.filter(Boolean).length; }
  function allWords() { return VOCAB.concat(S.custom); }

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
  store.onAdopt(function () { Q = buildQueue(); flipped = false; renderAll(); });

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

  function renderVocab() {
    var t = srs.dayNum(), words = allWords(), learning = 0, mastered = 0, news = 0;
    words.forEach(function (w) {
      var c = S.cards[w[0]];
      if (!c) news++; else if (c.iv >= 21) mastered++; else learning++;
    });
    var box = $("srsStats"); box.innerHTML = "";
    [["Cần ôn", Q.length], ["Chưa học", news], ["Đang học", learning], ["Đã thuộc", mastered]].forEach(function (x) {
      var d = document.createElement("div"), b = document.createElement("b"), s = document.createElement("span");
      b.textContent = x[1]; s.textContent = x[0]; d.appendChild(b); d.appendChild(s); box.appendChild(d);
    });
    var card = $("card"), btns = $("rate").querySelectorAll("button"), i;
    if (Q.length === 0) {
      var next = null;
      words.forEach(function (w) { var c = S.cards[w[0]]; if (c && c.due > t && (next === null || c.due < next)) next = c.due; });
      card.innerHTML = '<div class="w">Xong hôm nay</div><div class="ex"></div>';
      card.querySelector(".ex").textContent = next !== null
        ? "Thẻ tiếp theo đến hạn ngày " + dayLabel(next) + "."
        : news > 0 ? "Bạn đã học đủ " + NEW_PER_DAY + " từ mới hôm nay. Mai học tiếp." : "Chưa có thẻ nào.";
      for (i = 0; i < btns.length; i++) { btns[i].disabled = true; btns[i].querySelector("small").textContent = ""; }
    } else {
      var w = Q[0];
      if (!flipped) {
        card.innerHTML = '<div class="w"></div><div class="pos"></div><div class="hint">Chạm hoặc nhấn Space để lật thẻ</div>';
        card.querySelector(".w").textContent = w[0];
        card.querySelector(".pos").textContent = w[1] ? "(" + w[1] + ")" : "";
      } else {
        card.innerHTML = '<div class="w"></div><div class="mean"></div><div class="ex"></div>';
        card.querySelector(".w").textContent = w[0];
        card.querySelector(".mean").textContent = w[2];
        card.querySelector(".ex").textContent = w[3] || "";
      }
      var c = S.cards[w[0]] || srs.fresh();
      for (i = 0; i < btns.length; i++) {
        btns[i].disabled = !flipped;
        btns[i].querySelector("small").textContent = flipped ? ivText(srs.schedule(c, i).iv) : "";
      }
    }
    renderStats();
  }

  function rate(r) {
    if (!flipped || Q.length === 0) return;
    var w = Q[0], t = srs.dayNum(), c = S.cards[w[0]];
    if (!c) {
      c = srs.fresh();
      if (S.newDay === t) S.newCount++; else { S.newDay = t; S.newCount = 1; }
    }
    S.cards[w[0]] = srs.schedule(c, r);
    if (r === 0) { if (Q.length > 1) Q.push(Q.shift()); } else Q.shift();
    flipped = false;
    store.save();
    renderVocab();
  }
  $("card").addEventListener("click", function () { if (Q.length) { flipped = !flipped; renderVocab(); } });
  $("rate").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b && !b.disabled) rate(parseInt(b.getAttribute("data-r"), 10));
  });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey || $("appView").hidden || $("v-tu-vung").hidden) return;
    if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); if (Q.length) { flipped = !flipped; renderVocab(); } }
    else if (e.key >= "1" && e.key <= "4") rate(parseInt(e.key, 10) - 1);
  });
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = $("wWord").value.trim(), m = $("wMean").value.trim();
    if (!w || !m) return;
    var exists = allWords().some(function (x) { return x[0].toLowerCase() === w.toLowerCase(); });
    if (!exists) {
      S.custom.push([w, $("wPos").value.trim(), m, $("wEx").value.trim()]);
      store.save(); Q = buildQueue(); flipped = false; renderVocab();
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

  /* ---------- việc hôm nay ---------- */
  var DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  function streak() {
    var d = new Date(), n = 0;
    if (done(dayChecks(ymd(d))) < TASKS.length) d.setDate(d.getDate() - 1);
    while (done(dayChecks(ymd(d))) === TASKS.length) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderTodo() {
    var key = ymd(new Date()), cur = dayChecks(key), ul = $("todo");
    ul.innerHTML = "";
    TASKS.forEach(function (t, i) {
      var li = document.createElement("li"), lb = document.createElement("label"), cb = document.createElement("input"), sp = document.createElement("span");
      cb.type = "checkbox"; cb.id = "task" + i; cb.checked = !!cur[i]; sp.textContent = t;
      cb.addEventListener("change", function () {
        var k = ymd(new Date()), a = dayChecks(k).slice();
        a[i] = cb.checked; S.checks[k] = a; store.save(); renderStats(); renderWeek();
      });
      lb.appendChild(cb); lb.appendChild(sp); li.appendChild(lb); ul.appendChild(li);
    });
    var d = new Date();
    $("today").textContent = DAYS[d.getDay()] + ", " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function renderWeek() {
    var w = $("week"); w.innerHTML = "";
    for (var k = 6; k >= 0; k--) {
      var d = new Date(); d.setDate(d.getDate() - k);
      var n = done(dayChecks(ymd(d))), box = document.createElement("div"), i = document.createElement("i");
      i.className = n === TASKS.length ? "full" : n > 0 ? "part" : "";
      box.appendChild(i); box.appendChild(document.createTextNode(DAYS[d.getDay()])); w.appendChild(box);
    }
  }
  function renderStats() {
    $("sStreak").textContent = streak();
    $("sDue").textContent = Q.length;
    var bd = $("dueBadge"); bd.textContent = Q.length; bd.hidden = Q.length === 0;
    $("goTxt").textContent = Q.length ? "Có " + Q.length + " thẻ cần ôn hôm nay." : "Hôm nay bạn đã ôn xong. Thẻ mới hiện khi đến hạn.";
    $("sToday").textContent = done(dayChecks(ymd(new Date()))) + "/" + TASKS.length;
    $("sQuiz").textContent = S.quizBest === null ? "–" : S.quizBest + "/" + QUIZ.length;
  }

  /* ---------- Part 5 ---------- */
  var answered = {};
  function renderQuiz() {
    var box = $("quiz"); box.innerHTML = ""; answered = {};
    QUIZ.forEach(function (q, qi) {
      var wrap = document.createElement("div"); wrap.className = "q";
      var p = document.createElement("p"), n = document.createElement("span");
      n.className = "n"; n.textContent = 101 + qi;
      p.appendChild(n); p.appendChild(document.createTextNode(q[0])); wrap.appendChild(p);
      var o = document.createElement("div"); o.className = "opts";
      var why = document.createElement("p"); why.className = "why"; why.hidden = true;
      q[1].forEach(function (t, oi) {
        var b = document.createElement("button"); b.className = "opt"; b.type = "button";
        b.innerHTML = '<span class="b"></span><span class="t"></span>';
        b.querySelector(".b").textContent = "ABCD".charAt(oi);
        b.querySelector(".t").textContent = t;
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
    if (total === QUIZ.length && (S.quizBest === null || right > S.quizBest)) { S.quizBest = right; store.save(); renderStats(); }
  }
  $("qreset").addEventListener("click", renderQuiz);

  /* ---------- bảng cấu trúc ---------- */
  PARTS.forEach(function (r) {
    var tr = document.createElement("tr");
    r.forEach(function (c, i) {
      var td = document.createElement("td");
      if (i === 0 || i === 2) td.className = "num";
      if (i === 4) td.className = "tip";
      if (i === 1) { var s = document.createElement("span"); s.className = "tag"; s.textContent = c; td.appendChild(s); }
      else td.textContent = c;
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
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) location.hash = b.getAttribute("data-v"); });
  $("tabs").addEventListener("keydown", function (e) {
    var cur = document.activeElement && document.activeElement.getAttribute("data-v"), i = VIEWS.indexOf(cur);
    if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    var n = VIEWS[(i + (e.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length];
    location.hash = n; $("t-" + n).focus();
  });
  $("goVocab").addEventListener("click", function () { location.hash = "tu-vung"; });
  window.addEventListener("hashchange", showView);

  /* ---------- vẽ lại tất cả ---------- */
  function renderAll() { showTarget(); renderTodo(); renderWeek(); renderVocab(); }

  // sang ngày mới khi để trang mở qua đêm
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || $("appView").hidden) return;
    var d = srs.dayNum();
    if (d !== curDay) { curDay = d; Q = buildQueue(); flipped = false; renderAll(); }
  });

  /* ---------- vào / ra ứng dụng ---------- */
  function enterApp(user) {
    if (currentUser && user && currentUser === user.id) return;
    currentUser = user ? user.id : "local";
    store.start(client, user ? user.id : null);
    $("acctEmail").textContent = user ? user.email || "" : "";
    $("signout").hidden = !user;
    $("localnote").hidden = !!user;
    curDay = srs.dayNum(); Q = buildQueue(); flipped = false;
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
