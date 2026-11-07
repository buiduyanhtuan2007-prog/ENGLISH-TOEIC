/* Trạng thái học của bạn: lưu ngay trên máy, đồng bộ lên Supabase sau 0,8 giây.
   Mỗi người dùng có đúng một hàng trong bảng "progress" (cột data kiểu jsonb).
   Khi hai nơi khác nhau, bản có mốc "updated" mới hơn thắng. */
(function (root) {
  var TN = (root.TN = root.TN || {});
  var PREFIX = "toeic-notebook-v1:";

  function defaults() {
    return { target: 650, checks: {}, quizBest: null, cards: {}, custom: [], newDay: 0, newCount: 0, mode: "auto", updated: 0 };
  }
  function normalize(o) {
    var d = defaults();
    o = o && typeof o === "object" ? o : {};
    for (var k in d) if (o[k] !== undefined && o[k] !== null) d[k] = o[k];
    if (!Array.isArray(d.custom)) d.custom = [];
    if (typeof d.cards !== "object" || Array.isArray(d.cards)) d.cards = {};
    if (typeof d.checks !== "object" || Array.isArray(d.checks)) d.checks = {};
    d.updated = Number(d.updated) || 0;
    return d;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = defaults();
  var client = null, uid = null, cacheKey = PREFIX + "local";
  var dirty = false, writing = false, pulling = false, timer = null;
  var statusFn = function () {}, adoptFn = function () {};

  function replace(o) {
    var n = normalize(o);
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.keys(n).forEach(function (k) { state[k] = n[k]; });
  }
  function localSave() { try { localStorage.setItem(cacheKey, JSON.stringify(state)); } catch (e) {} }
  function localLoad() {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (raw) { replace(JSON.parse(raw)); return; }
    } catch (e) {}
    replace({});
  }
  function status(s) { statusFn(s); }

  function pull() {
    if (!client || !uid || pulling || writing) return Promise.resolve();
    pulling = true;
    var me = uid;
    return client.from("progress").select("data").eq("user_id", me).maybeSingle().then(function (res) {
      pulling = false;
      if (uid !== me) return;
      if (res.error) { status("error"); return; }
      if (res.data && res.data.data) {
        var remote = normalize(res.data.data);
        if (remote.updated > state.updated) { replace(remote); localSave(); adoptFn(); status("synced"); return; }
        if (remote.updated === state.updated) { if (dirty) queue(0); else status("synced"); return; }
      }
      if (state.updated === 0) { state.updated = Date.now(); localSave(); }
      queue(0);
    }, function () { pulling = false; status("offline"); });
  }

  function queue(delay) {
    if (!client || !uid) return;
    dirty = true;
    status("saving");
    clearTimeout(timer);
    timer = setTimeout(flush, delay === undefined ? 800 : delay);
  }

  function flush() {
    clearTimeout(timer);
    if (writing || !dirty || !client || !uid) return Promise.resolve();
    writing = true;
    dirty = false;
    var snap = clone(state), me = uid;
    return client.from("progress")
      .upsert({ user_id: me, data: snap, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .then(function (res) {
        writing = false;
        if (res.error) { dirty = true; status("error"); return; }
        if (dirty) return flush();
        status("synced");
      }, function () { writing = false; dirty = true; status("offline"); });
  }

  function save() {
    state.updated = Date.now();
    localSave();
    queue();
  }

  function start(c, id) {
    client = c || null;
    uid = id || null;
    cacheKey = PREFIX + (uid || "local");
    dirty = false; writing = false; pulling = false;
    localLoad();
    if (client && uid) { status("saving"); pull(); } else status("local");
  }
  function stop() {
    clearTimeout(timer);
    client = null; uid = null; dirty = false;
  }

  function recheck() {
    if (!client || !uid) return;
    if (dirty) flush(); else pull();
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") recheck(); });
  root.addEventListener("online", recheck);

  TN.store = {
    state: state,
    start: start,
    stop: stop,
    save: save,
    flush: flush,
    onStatus: function (fn) { statusFn = fn; },
    onAdopt: function (fn) { adoptFn = fn; }
  };
})(typeof window !== "undefined" ? window : globalThis);
