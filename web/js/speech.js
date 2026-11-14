// Opt-in sidecar listener for Mochi's four lesson words.
// Off until the player presses Listen. Recognised words call the same sayWord()
// path as the 1–4 buttons, so the ear cells light up in the brain view.
// Mochi's own Cadence 0.91.2 brain and learning are not touched.

import { RATE, logMel, resample, matchTemplates, makeVad, decodeWav, normalizeFrames, StreamResampler } from "./speech_front.js";

// Retuned for the level-normalised frames (chosen on held-out voices at several gains and noise levels).
const MIN_MARGIN = 0.010, MAX_DIST = 0.07;
const DEFAULT_WORDS = ["sit", "spin", "hop", "paw"];
const $ = id => document.getElementById(id);

function labelsOf(getLabels) {
  return (getLabels ? getLabels() : DEFAULT_WORDS).map(w => {
    const t = String(w || "").toLowerCase().replace(/[^a-z']/g, "");
    return t || "word";
  });
}

function baseUrl() {
  return new URL("../speech/", import.meta.url).href;
}

async function loadTemplates() {
  const res = await fetch(new URL("templates.json", baseUrl()));
  if (!res.ok) throw new Error("could not load speech templates");
  const data = await res.json();
  const out = {};
  for (const [word, rows] of Object.entries(data)) {
    out[word] = rows.map(frames => normalizeFrames(frames.map(row => Float64Array.from(row))));
  }
  return out;
}

export function attachSpeech({ sayWord, getLabels }) {
  const btn = $("listenBtn");
  if (!btn) return null; // embed / pages without the test controls


  // ---- phone layout : on narrow screens Mochi stays pinned at the top and a small dock sits at the bottom
  // with Listen, the level meter, a one-line status, the Show (hold) moves and Good/No, so Mochi and the controls are
  // on screen together. A chip over Mochi says what was heard and what Mochi did about it. Wide screens are unchanged.
  const chip = (() => {
    const stage = $("stage"); if (!stage) return { hearing() {}, heard() {}, unsure() {} };
    const el = document.createElement("div"); el.id = "heardChip"; el.hidden = true; el.setAttribute("aria-live", "polite"); stage.append(el);
    let hideAt = 0, timer = 0, poll = 0, hearingNow = false;
    const EMOJI = { eat: "🍽", sleep: "💤", pounce: "🎾", call: "📣", sit: "🪑", spin: "🌀", jump: "⤴", paw: "🐾" };
    const say = (text, cls, ms = 6000) => { el.textContent = text; el.className = cls || ""; el.hidden = false; hideAt = performance.now() + ms; clearTimeout(timer); timer = setTimeout(() => { if (performance.now() >= hideAt - 20 && !hearingNow) el.hidden = true; }, ms + 50); };
    return {
      hearing(open) { if (open && !hearingNow) { hearingNow = true; say("🎤 hearing…", "hearing", 4000); } else if (!open && hearingNow) { hearingNow = false; } },
      unsure(close) { say(close ? `👂 not sure, closest “${close}”. Say it again` : "👂 heard a sound, no match", "unsure"); },
      heard(word, index) {
        const m = window.mochi, page = m && m.page, entry = page && page.words[index];
        say(`👂 “${word}” → Mochi…`, "heard");
        clearInterval(poll); if (!entry) return;
        const before = entry.asked, t0 = performance.now();
        poll = setInterval(() => {
          if (entry.asked > before) {
            clearInterval(poll); const own = entry.recent[entry.recent.length - 1], names = m.ACTIONS || [];
            const act = own >= 0 ? names[own] : null;
            say(act ? `👂 “${word}” → Mochi: ${EMOJI[act] || ""} ${act}` : `👂 “${word}” → Mochi stays quiet`, act ? "heard did" : "heard", 7000);
          } else if (performance.now() - t0 > 4500) clearInterval(poll);
        }, 120);
      },
    };
  })();

  const dockHome = [];   // [node, placeholder]
  const dockMove = (id, rowClass, dock) => {
    const node = $(id); if (!node) return;
    const ph = document.createComment("dock:" + id); node.replaceWith(ph); dockHome.push([node, ph]);
    dock.querySelector("." + rowClass).append(node);
  };
  function setupDock() {
    const narrow = window.matchMedia("(max-width: 899px)");
    let dock = null, ro = null;
    const on = () => {
      if (dock) return;
      dock = document.createElement("div"); dock.id = "micDock";
      dock.innerHTML = '<div class="dock-error"></div><div class="dock-row dock-top"></div><div class="dock-row dock-moves"></div>';
      document.body.append(dock); document.body.classList.add("phone-dock");
      dockMove("listenBtn", "dock-top", dock); dockMove("micMeter", "dock-top", dock); dockMove("listenStatus", "dock-top", dock);
      dockMove("shows", "dock-moves", dock); dockMove("good", "dock-moves", dock); dockMove("no", "dock-moves", dock);
      const err = $("micError"); if (err) { const ph = document.createComment("dock:micError"); err.replaceWith(ph); dockHome.push([err, ph]); dock.querySelector(".dock-error").append(err); }
      dock.addEventListener("contextmenu", e => e.preventDefault());
      const fit = () => document.documentElement.style.setProperty("--dockH", dock.offsetHeight + "px");
      ro = new ResizeObserver(fit); ro.observe(dock); fit();
    };
    const off = () => {
      if (!dock) return;
      for (const [node, ph] of dockHome.splice(0).reverse()) ph.replaceWith(node);
      if (ro) ro.disconnect(); dock.remove(); dock = null; document.body.classList.remove("phone-dock");
    };
    const sync = () => narrow.matches ? on() : off();
    narrow.addEventListener ? narrow.addEventListener("change", sync) : narrow.addListener(sync);
    sync();
  }
  setupDock();

  const statusEl = $("listenStatus");
  const panel = $("speechPanel");
  const hint = $("speechCalHint");
  const sampleSel = $("speechSample");
  const state = {
    on: false,
    loading: false,
    sidecar: "off", // off | loading | ready | error
    templates: null,
    extra: {},
    worker: null,
    pending: new Map(),
    nextId: 1,
    stream: null,
    audio: null,
    processor: null,
    source: null,
    vad: null,
    lastWord: null,
    lastAt: 0,
    calibrating: null, // {word, need, have}
    stats: [],
  };

  const setStatus = (text, cls) => {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = "hint speech-status" + (cls ? " " + cls : "");
    }
  };
  const setHint = text => { if (hint) hint.textContent = text || ""; };

  function words() { return labelsOf(getLabels); }

  function decideLocal(audio) {
    if (!state.templates) return null;
    const frames = normalizeFrames(logMel(audio));
    const bank = {};
    for (const w of words()) bank[w] = [...(state.templates[w] || []), ...(state.extra[w] || [])];
    // if labels aren't the default words and we have no calibration, we can't match
    const have = words().some(w => (bank[w] || []).length);
    if (!have) return { word: null, method: "none", confidence: 0, templates: { pred: null, margin: 0, dist: {} } };
    const m = matchTemplates(frames, bank, words());
    let word = null, conf = 0;
    if (m.margin > MIN_MARGIN && m.dist[m.pred] < MAX_DIST) {
      word = m.pred;
      conf = Math.min(1, 0.45 + m.margin * 6);
    }
    return { word, method: word ? "templates" : "none", confidence: conf, templates: m, letters: "", listed: "" };
  }

  function fire(result, audio) {
    const now = performance.now();
    if (state.calibrating) {
      const word = state.calibrating.word;
      state.extra[word] = state.extra[word] || [];
      state.extra[word].push(normalizeFrames(logMel(audio)));
      state.calibrating.have += 1;
      if (state.worker && state.sidecar === "ready") {
        call({ op: "remember", samples: audio, rate: RATE, word }).catch(() => {});
      }
      const left = state.calibrating.need - state.calibrating.have;
      if (left <= 0) {
        const i = words().indexOf(word);
        const next = words()[i + 1];
        if (next) startCalibrate(next);
        else {
          setHint("Calibration saved in this tab. The listener now prefers your voice for these labels.");
          state.calibrating = null;
          btn.classList.toggle("on", state.on);
        }
      } else {
        setHint(`Heard "${word}" (${state.calibrating.have}/${state.calibrating.need}). Say it ${left} more time${left === 1 ? "" : "s"}.`);
      }
      return result;
    }
    let word = result && result.word;
    const index = words().indexOf(word);
    if (index < 0) {
      const t = result && result.templates, close = t && t.pred && Number.isFinite(t.dist[t.pred]) ? t.pred : null;
      setStatus(close ? `heard you, not sure: closest “${close}” (${t.dist[close].toFixed(3)}, gap ${t.margin.toFixed(3)}). Say it again, or try “Calibrate my voice”.` : "heard a sound, no match", "soft");
      chip.unsure(close);
      state.lastHeard = { at: now, close, dist: t && t.dist, margin: t && t.margin };
      return result;
    }
    if (state.lastWord === word && now - state.lastAt < 900) return result;
    state.lastWord = word;
    state.lastAt = now;
    try { sayWord(index); } catch (error) { console.warn("sayWord failed", error); }
    chip.heard(word, index);
    const how = result.method || "templates";
    setStatus(`heard “${word}” (${how})`, "heard");
    state.stats.push({ word, how, t: now, confidence: result.confidence || 0 });
    return result;
  }

  async function handleUtterance(audio) {
    const local = decideLocal(audio) || { word: null, method: "none", confidence: 0 };
    const t = local.templates; (state.log = state.log || []).push({ word: local.word, close: t && t.pred, margin: t && t.margin, dist: t && t.pred ? t.dist[t.pred] : null, seconds: audio.length / RATE, at: performance.now() }); if (state.log.length > 200) state.log.shift();
    // The 0.98 letter model, trained only on two minutes of TTS, is not a reliable
    // 4-word listener (it often says "spin"). Templates from cadence.speech's
    // log-mel front end decide; the sidecar result is kept for diagnostics.
    if (!state.calibrating) fire(local, audio);
    else fire(local, audio);
    if (state.sidecar === "ready") {
      try {
        const remote = await call({ op: "recognize", samples: audio, rate: RATE });
        state.lastRemote = remote;
        return { ...local, cadence: remote };
      } catch (error) {
        console.warn("sidecar recognize failed", error);
        return { ...local, error: String(error) };
      }
    }
    return local;
  }

  function call(message) {
    return new Promise((resolve, reject) => {
      if (!state.worker) return reject(new Error("no sidecar"));
      const id = state.nextId++;
      state.pending.set(id, { resolve, reject });
      // samples must be copied into a transferable buffer
      if (message.samples && message.samples.buffer) {
        const copy = message.samples instanceof Float64Array
          ? new Float64Array(message.samples)
          : new Float32Array(message.samples);
        message = { ...message, samples: copy };
        state.worker.postMessage({ id, message }, [copy.buffer]);
      } else {
        state.worker.postMessage({ id, message });
      }
    });
  }

  function startWorker() {
    if (state.worker || state.loading) return;
    state.loading = true;
    state.sidecar = "loading";
    setStatus("loading Cadence 0.98 speech…");
    const worker = new Worker(new URL("./speech_worker.js", import.meta.url), { type: "module" });
    state.worker = worker;
    worker.onmessage = ev => {
      const { id, result, error, status } = ev.data;
      if (status) setStatus(status);
      if (id == null) return;
      const pending = state.pending.get(id);
      if (!pending) return;
      state.pending.delete(id);
      if (error) pending.reject(new Error(error));
      else pending.resolve(result);
    };
    worker.onerror = ev => {
      state.sidecar = "error";
      state.loading = false;
      setStatus("sidecar failed; templates still work", "soft");
      console.warn("speech worker", ev);
    };
    call({
      op: "start",
      pyodide: "314.0.7",
      wheel: new URL("cadence_net-0.98.0-py3-none-any.whl", baseUrl()).href,
      brain: new URL("listener.npz", baseUrl()).href,
      hearing: new URL("hearing.json", baseUrl()).href,
      templates: new URL("templates.npz", baseUrl()).href,
      words: words(),
    }).then(() => {
      state.sidecar = "ready";
      state.loading = false;
      setStatus(state.on ? "listening (Cadence 0.98 ready)" : "mic off · sidecar ready");
    }).catch(error => {
      state.sidecar = "error";
      state.loading = false;
      setStatus("sidecar failed; templates still work", "soft");
      console.warn(error);
    });
  }

  // ---- the mic (rewritten for iPhone/WebKit: everything audio-related is started synchronously inside the tap)
  const meter = $("micMeter"), meterFill = meter && meter.querySelector("i"), meterMark = meter && meter.querySelector("b");
  const errBox = $("micError");
  let raf = 0;
  function showError(text) {
    if (errBox) { errBox.textContent = text || ""; errBox.hidden = !text; }
    if (text) setStatus(text.split(". ")[0], "soft");
  }
  function drawMeter() {
    raf = 0;
    if (!meter || !state.on) return;
    const v = state.vad, lvl = v ? v.level : 0;
    const db = x => Math.max(0, Math.min(1, (20 * Math.log10(x + 1e-6) + 60) / 50));   // -60..-10 dBFS
    meterFill.style.width = (db(lvl) * 100).toFixed(0) + "%";
    meterMark.style.left = (db(v ? v.thresh : 0.01) * 100).toFixed(0) + "%";
    meter.classList.toggle("hot", !!v && v.open);
    chip.hearing(!!v && v.open);
    meter.hidden = false;
  }
  const wantMeter = () => { if (!raf) raf = requestAnimationFrame(drawMeter); };

  function micError(error) {
    const name = error && error.name, text = String(error && error.message || error);
    if (!window.isSecureContext) return "The mic needs a secure (https) page.";
    if (name === "NotAllowedError" || name === "SecurityError" || /permission|denied|not allowed/i.test(text))
      return "Mic blocked. On iPhone: tap the aA icon in the address bar, Website Settings, Microphone, Allow, then reload the page and tap Listen again (also check Settings > Safari > Microphone).";
    if (name === "Paused") return "iOS would not start the audio engine. Tap Listen again with the screen on and no call or recording running; if it keeps failing, reload the page and tap Listen first thing.";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found on this device.";
    if (name === "NotReadableError" || name === "AbortError") return "The mic is busy in another app or call. Close it and tap Listen again.";
    return "Could not start the mic (" + (name || "error") + (text ? ": " + text.slice(0, 80) : "") + ").";
  }

  const timeout = (ms, what) => new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(what), { name: "Timeout" })), ms));

  // Called synchronously from the click. The AudioContext is created and resumed HERE, before any await, because
  // iOS Safari only lets a context run if it is created/resumed inside the user's tap (after the permission prompt
  // the tap no longer counts and resume() never settles).
  function turnOn() {
    if (state.on || state.starting) return Promise.resolve();
    state.starting = true; state.on = true; showError("");
    btn.classList.add("on"); btn.textContent = "🎤 Listening";
    if (panel) panel.hidden = false;
    setStatus("starting microphone…");
    let ctx = null, gum = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw Object.assign(new Error("no Web Audio"), { name: "NoAudio" });
      ctx = new AC({ latencyHint: "interactive" });          // default rate: iPhones give 48000 (44100 on some Bluetooth)
      state.audio = ctx;
      if (ctx.resume) ctx.resume().catch(() => {});
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("no getUserMedia"), { name: window.isSecureContext ? "NoMedia" : "SecurityError" });
      gum = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
        .catch(error => error && error.name === "OverconstrainedError" ? navigator.mediaDevices.getUserMedia({ audio: true, video: false }) : Promise.reject(error));
    } catch (error) {
      return failStart(error);
    }
    const nudge = setTimeout(() => { if (state.on && state.starting) setStatus("waiting for you to tap Allow on the microphone prompt…", "soft"); }, 3000);
    return (async () => {
      try {
        const stream = await Promise.race([gum, timeout(45000, "the mic permission prompt was not answered")]);
        clearTimeout(nudge);
        state.stream = stream;
        if (!state.on) { stream.getTracks().forEach(t => t.stop()); return; }          // turned off while the prompt was up
        setStatus("starting microphone…");
        await ensureRunning(ctx);
        await buildGraph(ctx, stream);
        state.starting = false;
        watchContext(ctx);
        if (new URLSearchParams(location.search).has("sidecar")) startWorker();   // diagnostics only; off by default (memory on phones)
        setStatus("listening… getting to know the room", "heard");
        // nothing is arriving? say so instead of looking dead
        state.chunks = 0; state.startedAt = performance.now();
        setTimeout(() => {
          if (state.on && state.chunks === 0) { showError("The mic opened but no sound is arriving. Tap Listen to stop and start again; on iPhone make sure no call, Siri or recording is using the mic."); }
        }, 3500);
      } catch (error) {
        failStart(error);
      }
    })();
  }

  function failStart(error) {
    console.warn("mic start failed", error); if (typeof nudge !== "undefined") clearTimeout(nudge);
    const text = error && (error.name === "NoAudio" ? "This browser cannot open audio." : error.name === "Timeout" ? "The mic permission prompt was not answered. Tap Listen to try again." : micError(error));
    turnOff(true);
    showError(text);
    return Promise.resolve();
  }

  async function ensureRunning(ctx) {
    if (ctx.state !== "running") { try { await Promise.race([ctx.resume(), timeout(2500, "audio would not start")]); } catch (e) { /* checked below */ } }
    if (ctx.state !== "running") throw Object.assign(new Error("The audio engine is paused (state: " + ctx.state + ")"), { name: "Paused" });
  }

  async function buildGraph(ctx, stream) {
    const source = ctx.createMediaStreamSource(stream);
    state.source = source;
    state.rate = ctx.sampleRate;
    state.resampler = new StreamResampler(ctx.sampleRate, RATE);
    state.vad = makeVad();
    const feed = block => {
      if (!state.on) return;
      state.chunks = (state.chunks || 0) + 1;
      const audio = state.resampler.push(block);
      if (!audio.length) return;
      for (const utt of state.vad.push(audio)) handleUtterance(utt);
      wantMeter();
    };
    state.silent = ctx.createGain(); state.silent.gain.value = 0;
    let worklet = false;
    if (ctx.audioWorklet && typeof AudioWorkletNode !== "undefined") {
      try {
        const code = `class Tap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0}process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===1024){this.port.postMessage(this.b.slice(0));this.n=0}}return true}}registerProcessor("mochi-tap",Tap);`;
        const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
        await Promise.race([ctx.audioWorklet.addModule(url), timeout(4000, "worklet load")]);
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(ctx, "mochi-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
        node.port.onmessage = e => feed(e.data);
        source.connect(node); node.connect(state.silent); state.silent.connect(ctx.destination);
        state.processor = node; worklet = true;
      } catch (error) { console.warn("AudioWorklet unavailable, using ScriptProcessor", error); try { source.disconnect(); } catch (e) {} }
    }
    if (!worklet) {
      const node = ctx.createScriptProcessor(4096, 1, 1);          // kept on `state` so Safari cannot garbage-collect it
      node.onaudioprocess = e => feed(Float32Array.from(e.inputBuffer.getChannelData(0)));
      source.connect(node); node.connect(state.silent); state.silent.connect(ctx.destination);
      state.processor = node;
    }
    state.path = worklet ? "worklet" : "scriptprocessor";
  }

  // iOS pauses audio for calls, Siri, the lock screen and tab switches ('interrupted'); bring it back when we can.
  function watchContext(ctx) {
    const revive = () => {
      if (!state.on || state.audio !== ctx) return;
      if (ctx.state !== "running") {
        setStatus("audio paused (" + ctx.state + "), tap anywhere to resume", "soft");
        try { ctx.resume().then(() => { if (ctx.state === "running") setStatus("listening…", "heard"); }).catch(() => {}); } catch (e) {}
      }
    };
    state.revive = revive;
    ctx.onstatechange = revive;
    document.addEventListener("visibilitychange", revive);
    document.addEventListener("pointerdown", revive, true);
    state.watch = setInterval(revive, 2000);
  }

  function stopMic() {
    if (state.watch) clearInterval(state.watch);
    if (state.revive) { document.removeEventListener("visibilitychange", state.revive); document.removeEventListener("pointerdown", state.revive, true); }
    if (state.audio) { try { state.audio.onstatechange = null; } catch (e) {} }
    if (state.processor) { try { if (state.processor.port) state.processor.port.onmessage = null; else state.processor.onaudioprocess = null; state.processor.disconnect(); } catch (e) {} }
    if (state.source) try { state.source.disconnect(); } catch (e) {}
    if (state.silent) try { state.silent.disconnect(); } catch (e) {}
    if (state.audio) try { state.audio.close(); } catch (e) {}
    if (state.stream) state.stream.getTracks().forEach(t => t.stop());
    state.processor = state.source = state.audio = state.stream = state.vad = state.silent = state.resampler = state.revive = state.watch = null;
    if (meter) meter.hidden = true;
  }

  function turnOff(keepError) {
    state.on = false; state.starting = false;
    btn.classList.remove("on");
    btn.textContent = "🎤 Listen";
    stopMic();
    if (!keepError) showError("");
    setStatus(state.sidecar === "ready" ? "mic off · sidecar ready" : "mic off");
    if (state.calibrating) {
      state.calibrating = null;
      setHint("Calibration cancelled.");
    }
  }

  function startCalibrate(word) {
    const list = words();
    const target = word || list[0];
    state.calibrating = { word: target, need: 3, have: 0 };
    state.extra[target] = [];
    setHint(`Calibration: say “${target}” three times, clearly, with a short pause after each.`);
    if (!state.on) turnOn();
    else btn.classList.add("on");
  }

  btn.addEventListener("click", () => {
    if (state.on) turnOff();
    else turnOn();                     // must run synchronously inside the tap (iOS)
  });

  const calBtn = $("speechCalibrate");
  if (calBtn) calBtn.addEventListener("click", () => startCalibrate());

  const wavInput = $("speechWav");
  if (wavInput) wavInput.addEventListener("change", async ev => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    try {
      const { audio } = decodeWav(new Uint8Array(await file.arrayBuffer()));
      setStatus("scoring the WAV…");
      const result = await handleUtterance(audio);
      if (!result || !result.word) setStatus(result && result.listed ? `WAV said “${result.listed}”` : "WAV did not match a lesson word", "soft");
    } catch (error) {
      setStatus("could not read that WAV", "soft");
      console.warn(error);
    }
  });

  if (sampleSel) {
    sampleSel.innerHTML = `<option value="">try a sample…</option>` +
      DEFAULT_WORDS.map(w => `<option value="${w}.wav">${w} (held-out voice)</option>`).join("") +
      DEFAULT_WORDS.map(w => `<option value="${w}_amy.wav">${w} (train voice)</option>`).join("");
    sampleSel.addEventListener("change", async () => {
      const name = sampleSel.value;
      sampleSel.value = "";
      if (!name) return;
      try {
        const res = await fetch(new URL("samples/" + name, baseUrl()));
        if (!res.ok) throw new Error("missing sample");
        const { audio } = decodeWav(new Uint8Array(await res.arrayBuffer()));
        setStatus(`playing ${name}…`);
        const result = await handleUtterance(audio);
        window.mochiSpeech.last = result;
      } catch (error) {
        setStatus("sample missing", "soft");
        console.warn(error);
      }
    });
  }

  loadTemplates().then(t => { state.templates = t; }).catch(error => {
    console.warn("templates", error);
    setStatus("templates missing", "soft");
  });

  const api = {
    state,
    turnOn, turnOff, startCalibrate, startWorker,
    async feed(audio, rate = RATE) {
      const samples = rate === RATE ? Float64Array.from(audio) : resample(audio, rate, RATE);
      return handleUtterance(samples);
    },
    async feedWavBytes(bytes) {
      const { audio } = decodeWav(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      return handleUtterance(audio);
    },
    words, decideLocal,
  };
  window.mochiSpeech = api;
  return api;
}
