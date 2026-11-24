// Mochi's brain, in a worker. A brain pack names everything this worker loads: the Pyodide
// release, the Cadence wheel the brain was raised on, and the brain host sources of that day.
// One serial owner; the page never blocks on it.
// Messages: {id, message} in, {id, result} or {id, error} out. Brain files travel as ArrayBuffers.
//
// Cadence 0.103.0's optional WebAssembly kernel is on by default. A page may pass
// message.wasm = false (or open with ?wasm=0) to keep the NumPy loop. If the kernel
// file is missing or fails to load, Cadence falls back to the NumPy loop and the page still runs.

let pyodide = null;
let handle = null;
let wasmInfo = null;

const status = stage => self.postMessage({ status: stage });

async function fetchKernel() {
  const candidates = [
    new URL("cadence_kernel.wasm", self.location).href,
    new URL("/web/cadence_kernel.wasm", self.location).href,
    new URL("/cadence_kernel.wasm", self.location).href,
  ];
  const tried = [];
  for (const url of candidates) {
    if (tried.includes(url)) continue;
    tried.push(url);
    try {
      const response = await fetch(url);
      if (response.ok) return { url, response };
    } catch (_) { /* try the next location */ }
  }
  throw new Error("could not fetch the kernel file");
}

async function loadWasm(want) {
  const info = { wanted: !!want, loaded: false, bytes: 0, path: null, error: null };
  if (!want) return info;
  status("loading the speed-up");
  try {
    const { url, response } = await fetchKernel();
    info.path = url;
    const bytes = new Uint8Array(await response.arrayBuffer());
    info.bytes = bytes.byteLength;
    pyodide.FS.writeFile("/home/pyodide/cadence_kernel.wasm", bytes);
    pyodide.runPython("import os; os.environ['CADENCE_WASM'] = '/home/pyodide/cadence_kernel.wasm'");
  } catch (error) {
    info.error = String(error && error.message ? error.message : error);
  }
  return info;
}

async function start(packUrl, wantWasm) {
  status("reading the brain pack");
  const manifest = await (await fetch(new URL("manifest.json", packUrl))).json();
  if (manifest.schema !== "mochi-brain-pack/1") throw new Error("not a mochi-brain-pack/1");
  const cdn = `https://cdn.jsdelivr.net/pyodide/v${manifest.pyodide}/full/`;
  status("loading Python");
  const { loadPyodide } = await import(cdn + "pyodide.mjs");
  pyodide = await loadPyodide({ indexURL: cdn });
  status("loading numpy");
  await pyodide.loadPackage("numpy");
  status(`loading Cadence ${manifest.cadence}`);
  const wheel = await (await fetch(new URL(manifest.wheel, packUrl))).arrayBuffer();
  pyodide.unpackArchive(new Uint8Array(wheel), "wheel");
  wasmInfo = await loadWasm(wantWasm);
  status("loading the brain's own code");
  pyodide.FS.mkdirTree("/home/pyodide/mochi");
  for (const name of manifest.sources) {
    const response = await fetch(new URL("py/" + name, packUrl));
    if (!response.ok) throw new Error(`the pack lacks py/${name}`);
    pyodide.FS.writeFile("/home/pyodide/mochi/" + name, await response.text());
  }
  const loaded = pyodide.runPython(`
import sys, warnings, json
warnings.simplefilter("ignore")
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")
from mochi.host import Host
_host = Host()
from cadence import _wasm
json.dumps(bool(_wasm.available()))
`);
  handle = pyodide.globals.get("_host").handle_json;
  try {
    wasmInfo.loaded = JSON.parse(typeof loaded === "string" ? loaded : String(loaded)) === true;
  } catch (_) {
    wasmInfo.loaded = false;
  }
  if (wantWasm && !wasmInfo.loaded && !wasmInfo.error) {
    wasmInfo.error = "the kernel file was present but Cadence did not switch to it (NumPy loop is in use)";
  }
  return manifest;
}

function call(message) {
  const result = JSON.parse(handle(JSON.stringify(message)));
  if (result.error) throw new Error(result.error);
  return result;
}

self.onmessage = async event => {
  let { id, message } = event.data;
  try {
    if (message.op === "start") {
      const wantWasm = message.wasm !== false && message.wasm !== 0 && message.wasm !== "0";
      const manifest = await start(message.pack, wantWasm);
      self.postMessage({ id, result: { manifest, wasm: wasmInfo } });
      return;
    }
    if (message.bytes) {                       // boot or load from a saved brain
      pyodide.FS.writeFile("/tmp/brain-in.life", new Uint8Array(message.bytes));
      message = { ...message, bytes: undefined, path: "/tmp/brain-in.life" };
    }
    if (message.op === "save") {
      const result = call({ op: "save", path: "/tmp/brain-out.life" });
      const bytes = pyodide.FS.readFile("/tmp/brain-out.life");
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      self.postMessage({ id, result: { bytes: buffer, size: result.bytes } }, [buffer]);
      return;
    }
    self.postMessage({ id, result: call(message) });
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message ? error.message : error) });
  }
};
