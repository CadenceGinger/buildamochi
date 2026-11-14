// Log-mel front end and a small word matcher, matching cadence.speech.frontend
// (RATE 16 kHz, 25 ms frames every 10 ms, 40 mel bands, 512-point FFT).
// Used so the test page can score templates without waiting on the sidecar, and
// so a WAV or the mic can be resampled in one place.

export const RATE = 16000;
export const FRAME = 400;
export const HOP = 160;
export const FFT = 512;
export const MELS = 40;

function hanning(n) {
  const w = new Float64Array(n);
  if (n === 1) { w[0] = 1; return w; }
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

const HANN = hanning(FRAME);

function melHz(hz) { return 2595 * Math.log10(1 + hz / 700); }
function hzMel(m) { return 700 * (10 ** (m / 2595) - 1); }

function melBank(mels = MELS, rate = RATE, fft = FFT) {
  const bins = fft / 2 + 1;
  const freqs = new Float64Array(bins);
  for (let i = 0; i < bins; i++) freqs[i] = i * rate / fft;
  const edges = new Float64Array(mels + 2);
  const lo = melHz(0), hi = melHz(rate / 2);
  for (let i = 0; i < edges.length; i++) edges[i] = hzMel(lo + (hi - lo) * i / (mels + 1));
  const bank = Array.from({ length: mels }, () => new Float64Array(bins));
  for (let m = 0; m < mels; m++) {
    const low = edges[m], mid = edges[m + 1], high = edges[m + 2];
    const row = bank[m];
    for (let k = 0; k < bins; k++) {
      const f = freqs[k];
      const rise = (f - low) / Math.max(mid - low, 1e-9);
      const fall = (high - f) / Math.max(high - mid, 1e-9);
      const v = Math.min(rise, fall);
      row[k] = v > 0 ? v : 0;
    }
  }
  return bank;
}

const BANK = melBank();

// In-place radix-2 FFT on complex arrays (length is a power of two).
function fft(re, im) {
  const n = re.length;
  if (n <= 1) return;
  const half = n / 2;
  const evenRe = new Float64Array(half), evenIm = new Float64Array(half);
  const oddRe = new Float64Array(half), oddIm = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    evenRe[i] = re[2 * i]; evenIm[i] = im[2 * i];
    oddRe[i] = re[2 * i + 1]; oddIm[i] = im[2 * i + 1];
  }
  fft(evenRe, evenIm);
  fft(oddRe, oddIm);
  for (let k = 0; k < half; k++) {
    const ang = -2 * Math.PI * k / n;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const vr = oddRe[k] * wr - oddIm[k] * wi;
    const vi = oddRe[k] * wi + oddIm[k] * wr;
    re[k] = evenRe[k] + vr; im[k] = evenIm[k] + vi;
    re[k + half] = evenRe[k] - vr; im[k + half] = evenIm[k] - vi;
  }
}

export function logMel(audio, { rate = RATE, mels = MELS, frame = FRAME, hop = HOP, fftSize = FFT, bank = BANK } = {}) {
  let samples = audio instanceof Float64Array ? audio : Float64Array.from(audio);
  if (samples.length < frame) {
    const padded = new Float64Array(frame);
    padded.set(samples);
    samples = padded;
  }
  const count = 1 + Math.floor((samples.length - frame) / hop);
  const out = Array.from({ length: count }, () => new Float64Array(mels));
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const bins = fftSize / 2 + 1;
  const power = new Float64Array(bins);
  for (let t = 0; t < count; t++) {
    re.fill(0); im.fill(0);
    const off = t * hop;
    for (let i = 0; i < frame; i++) re[i] = samples[off + i] * HANN[i];
    fft(re, im);
    for (let k = 0; k < bins; k++) power[k] = re[k] * re[k] + im[k] * im[k];
    const row = out[t];
    for (let m = 0; m < mels; m++) {
      let s = 0;
      const b = bank[m];
      for (let k = 0; k < bins; k++) s += power[k] * b[k];
      row[m] = Math.log(s + 1e-6);
    }
  }
  return out;
}

export function resample(audio, src, dst = RATE) {
  if (src === dst) return Float64Array.from(audio);
  const n = Math.round(audio.length * dst / src);
  const out = new Float64Array(n);
  const scale = src / dst;
  for (let i = 0; i < n; i++) {
    const x = i * scale;
    const j = Math.floor(x);
    const f = x - j;
    const a = audio[j] || 0;
    const b = audio[Math.min(j + 1, audio.length - 1)] || 0;
    out[i] = a + (b - a) * f;
  }
  return out;
}

// Gain- and noise-floor-proof frames for matching (TEST FIX, iPhone report): the raw log-mel the templates were
// first made from sits ~20 dB louder than a phone mic and has a digital-silence floor (-13.8) that no real room
// has, so the cosine match never fired on a quiet phone. Peak-normalise (the loudest frame's mean band level is
// 0) and floor everything more than NORM_FLOOR nats under it. Same function for templates and for what is heard.
export const NORM_FLOOR = 5;
export function normalizeFrames(frames, floor = NORM_FLOOR) {
  let peak = -Infinity;
  const means = frames.map(row => { let s = 0; for (let i = 0; i < row.length; i++) s += row[i]; return s / row.length; });
  for (const m of means) if (m > peak) peak = m;
  return frames.map(row => { const out = new Float64Array(row.length); for (let i = 0; i < row.length; i++) out[i] = Math.max(row[i] - peak, -floor); return out; });
}

// Streaming sample-rate converter with an anti-alias low-pass (windowed sinc), for the context's real rate
// (48000 on most iPhones, 44100 with some Bluetooth, 16000 sometimes). State carries across chunks.
export class StreamResampler {
  constructor(src, dst = RATE, taps = 12) {
    this.src = src; this.dst = dst; this.ratio = src / dst; this.taps = taps;
    this.cut = Math.min(1, dst / src) * 0.92;                // low-pass just under the new Nyquist
    this.buf = new Float32Array(0); this.pos = 0;            // pos: input index of the next output sample
  }
  push(chunk) {
    if (this.src === this.dst) return Float32Array.from(chunk);
    const merged = new Float32Array(this.buf.length + chunk.length); merged.set(this.buf); merged.set(chunk, this.buf.length); this.buf = merged;
    const out = [];
    const half = Math.ceil(this.taps * Math.max(1, this.ratio) / 2);
    while (this.pos + half < this.buf.length) {
      const c = this.pos; let sum = 0, norm = 0;
      const n0 = Math.max(0, Math.ceil(c - half)), n1 = Math.min(this.buf.length - 1, Math.floor(c + half));
      for (let n = n0; n <= n1; n++) {
        const d = n - c, x = d * this.cut;
        const w = 0.5 + 0.5 * Math.cos(Math.PI * d / half);
        const s = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
        const k = s * w; sum += this.buf[n] * k; norm += k;
      }
      out.push(norm ? sum / norm : 0); this.pos += this.ratio;
    }
    const drop = Math.max(0, Math.floor(this.pos - half) - 1);
    if (drop > 0) { this.buf = this.buf.slice(drop); this.pos -= drop; }
    return Float32Array.from(out);
  }
}

export function dtw(a, b) {
  const stepA = Math.max(1, Math.floor(a.length / 24));
  const stepB = Math.max(1, Math.floor(b.length / 24));
  const A = a.filter((_, i) => i % stepA === 0);
  const B = b.filter((_, i) => i % stepB === 0);
  const n = A.length, m = B.length;
  const cost = (x, y) => {
    let dot = 0, nx = 0, ny = 0;
    for (let k = 0; k < x.length; k++) { dot += x[k] * y[k]; nx += x[k] * x[k]; ny += y[k] * y[k]; }
    return 1 - dot / ((Math.sqrt(nx) + 1e-9) * (Math.sqrt(ny) + 1e-9));
  };
  const dp = Array.from({ length: n + 1 }, () => {
    const row = new Float64Array(m + 1);
    row.fill(Infinity);
    return row;
  });
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    const row = dp[i], prev = dp[i - 1], ai = A[i - 1];
    for (let j = 1; j <= m; j++) {
      row[j] = cost(ai, B[j - 1]) + Math.min(prev[j], row[j - 1], prev[j - 1]);
    }
  }
  return dp[n][m] / (n + m);
}

export function matchTemplates(frames, templates, words) {
  const dist = {};
  for (const word of words) {
    const bank = templates[word] || [];
    if (!bank.length) { dist[word] = Infinity; continue; }
    let best = Infinity;
    for (const t of bank) best = Math.min(best, dtw(frames, t));
    dist[word] = best;
  }
  const order = words.slice().sort((a, b) => dist[a] - dist[b]);
  const pred = order[0];
  const margin = (dist[order[1]] ?? Infinity) - (dist[pred] ?? Infinity);
  return { pred, margin, dist, method: "templates" };
}

// Energy VAD (TEST FIX): the old fixed floor of 0.018 RMS was above a phone's speech level at arm's length. This one
// learns the room first (about 0.6 s of ambient), then opens at 3x the room's level and never below 0.004.
// level / noise / thresh are readable for the on-screen meter.
export function makeVad({ startMs = 80, endMs = 420, minMs = 200, hangMs = 120, floorMin = 0.004, warmMs = 600 } = {}) {
  const startN = Math.round(startMs * RATE / 1000);
  const endN = Math.round(endMs * RATE / 1000);
  const minN = Math.round(minMs * RATE / 1000);
  const warmN = Math.round(warmMs * RATE / 1000);
  let noise = 0.003, heard = 0, level = 0;
  let spoken = 0, quiet = 0;
  let open = false;
  let buf = new Float64Array(0);
  const thresh = () => Math.max(floorMin, noise * 3);
  return {
    get open() { return open; },
    get level() { return level; },
    get noise() { return noise; },
    get thresh() { return thresh(); },
    get warm() { return heard >= warmN; },
    push(chunk) {
      const c = chunk instanceof Float64Array ? chunk : Float64Array.from(chunk);
      let sq = 0; for (let i = 0; i < c.length; i++) sq += c[i] * c[i];
      const energy = Math.sqrt(sq / Math.max(1, c.length));
      level = energy;
      if (heard < warmN) {                      // learn the room before opening for anything
        heard += c.length; noise = heard === c.length ? energy : Math.max(noise * 0.7 + energy * 0.3, 1e-4);
        return [];
      }
      const th = thresh();
      if (!open) noise = energy < noise ? noise * 0.5 + energy * 0.5 : noise + (energy - noise) * 0.02;   // fast down, slow up
      const next = new Float64Array(buf.length + c.length);
      next.set(buf); next.set(c, buf.length); buf = next;
      const released = [];
      if (!open) {
        if (energy > th) spoken += c.length; else spoken = 0;
        if (spoken >= startN) {
          open = true; quiet = 0;
          const keep = Math.min(buf.length, spoken + Math.round((hangMs + 160) * RATE / 1000));
          buf = buf.slice(buf.length - keep);
        } else if (buf.length > RATE) {
          buf = buf.slice(buf.length - Math.round(0.4 * RATE));
        }
      } else {
        if (energy < th * 0.8) quiet += c.length; else quiet = 0;
        if (quiet >= endN) {
          if (buf.length - quiet >= minN) released.push(buf.slice(0, buf.length - Math.round(quiet * 0.4)));
          buf = new Float64Array(0); open = false; spoken = 0; quiet = 0;
        }
        if (buf.length > 4 * RATE) { released.push(buf); buf = new Float64Array(0); open = false; spoken = 0; quiet = 0; }
      }
      return released;
    },
    flush() {
      const out = (open && buf.length >= minN) ? [buf] : [];
      buf = new Float64Array(0); open = false; spoken = 0; quiet = 0;
      return out;
    },
  };
}

export function decodeWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== "RIFF") {
    throw new Error("not a WAV file");
  }
  let off = 12, rate = 0, ch = 1, bits = 16, dataOff = 0, dataLen = 0;
  while (off + 8 <= view.byteLength) {
    const id = String.fromCharCode(view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3));
    const size = view.getUint32(off + 4, true);
    if (id === "fmt ") {
      ch = view.getUint16(off + 10, true);
      rate = view.getUint32(off + 12, true);
      bits = view.getUint16(off + 22, true);
    } else if (id === "data") {
      dataOff = off + 8;
      dataLen = size;
      break;
    }
    off += 8 + size + (size & 1);
  }
  if (!dataOff) throw new Error("WAV has no data chunk");
  const n = Math.floor(dataLen / (bits / 8));
  const raw = new Float64Array(Math.floor(n / ch));
  if (bits === 16) {
    for (let i = 0, o = 0; o < raw.length; i += ch, o++) {
      let s = 0;
      for (let c = 0; c < ch; c++) s += view.getInt16(dataOff + (i + c) * 2, true) / 32768;
      raw[o] = s / ch;
    }
  } else if (bits === 32) {
    for (let i = 0, o = 0; o < raw.length; i += ch, o++) {
      let s = 0;
      for (let c = 0; c < ch; c++) s += view.getFloat32(dataOff + (i + c) * 4, true);
      raw[o] = s / ch;
    }
  } else {
    throw new Error("WAV bits must be 16 or 32");
  }
  return { audio: resample(raw, rate, RATE), rate: RATE };
}
