/* Phát âm bằng giọng đọc có sẵn của trình duyệt (không cần máy chủ, không cần khóa).
   Chất lượng giọng tùy thiết bị. Nếu thiết bị không có, các bài nghe tự tắt. */
(function (root) {
  var TN = (root.TN = root.TN || {});
  var syn = root.speechSynthesis, voices = [];

  function load() { try { voices = syn.getVoices() || []; } catch (e) { voices = []; } }
  if (syn) {
    load();
    if (syn.addEventListener) syn.addEventListener("voiceschanged", load);
  }

  function available() { return !!(syn && root.SpeechSynthesisUtterance); }

  /* Chọn giọng khớp ngôn ngữ (en-US hoặc en-GB), ưu tiên giọng cài sẵn trên máy. */
  function pick(lang) {
    var exact = voices.filter(function (v) { return v.lang && v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase(); });
    var any = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf("en") === 0; });
    var pool = exact.length ? exact : any;
    return pool.filter(function (v) { return v.localService; })[0] || pool[0] || null;
  }
  function hasEnglishVoice() { load(); return voices.some(function (v) { return v.lang && v.lang.toLowerCase().indexOf("en") === 0; }); }

  function speak(text, opt) {
    if (!available() || !text) return false;
    opt = opt || {};
    try {
      syn.cancel();
      var u = new root.SpeechSynthesisUtterance(text), lang = opt.lang || "en-US";
      u.lang = lang;
      u.rate = opt.rate || 1;
      var v = pick(lang);
      if (v) u.voice = v;
      if (opt.onend) u.onend = opt.onend;
      if (opt.onerror) u.onerror = opt.onerror;
      if (opt.onstart) u.onstart = opt.onstart;
      syn.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function stop() { try { if (syn) syn.cancel(); } catch (e) {} }

  TN.tts = { available: available, hasEnglishVoice: hasEnglishVoice, speak: speak, stop: stop };
})(typeof window !== "undefined" ? window : globalThis);
