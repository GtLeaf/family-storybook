import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { parse } = createRequire(require.resolve("eslint"))("espree");
const root = path.resolve("dist-xhs");
const files = [];
async function walk(dir) {
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name);
    if ((await stat(file)).isDirectory()) await walk(file); else files.push(file);
  }
}
await walk(root);
const allowed = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".woff", ".woff2", ".json"]);
const errors = [], mediaExceptions = [];
for (const file of files) {
  const ext = path.extname(file);
  if (!allowed.has(ext)) {
    if (ext === ".mp3") mediaExceptions.push(path.relative(root, file));
    else errors.push(`禁止的文件类型：${file}`);
  }
  if (ext === ".js") {
    const code = await readFile(file, "utf8");
    parse(code, { ecmaVersion: 2017, sourceType: "script" });
    for (const pattern of [/\beval\s*\(/, /new\s+Function\b/, /\bfetch\s*\(/, /XMLHttpRequest/, /WebAssembly/, /new\s+(?:WebSocket|Worker|SharedWorker|EventSource|RTCPeerConnection)\b/, /window\.open\s*\(/, /navigator\.(?:geolocation|clipboard|bluetooth|usb|hid|serial|serviceWorker)/, /data:audio/, /blob:audio/]) {
      if (pattern.test(code)) errors.push(`${file} 包含受限能力 ${pattern}`);
    }
    for (const match of code.matchAll(/\.\/assets\/[\w-]+\.mp3/g)) {
      if (!files.includes(path.join(root, match[0]))) errors.push(`缺少音频：${match[0]}`);
    }
  }
  if (ext === ".mp3") execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
}
const html = await readFile(path.join(root, "index.html"), "utf8");
if (files.filter(f => f.endsWith(".html")).length !== 1) errors.push("只允许一个 HTML 入口");
if (/<base\b|<iframe\b|<object\b|type=["']module|\son\w+=|javascript:/i.test(html)) errors.push("HTML 包含受限入口或内联事件");
for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/\bsrc=["']\.\//.test(script[1]) || script[2].trim()) errors.push("脚本必须是包内经典外链脚本");
}
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  if (!match[1].startsWith("./") || !files.includes(path.resolve(root, match[1]))) errors.push(`入口资源不可用：${match[1]}`);
}
const css = await readFile(path.join(root, "style.css"), "utf8");
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  if (/^(data:|#|%23)/.test(match[1])) continue;
  if (!match[1].startsWith("./") || !files.includes(path.resolve(root, match[1]))) errors.push(`样式资源不可用：${match[1]}`);
}
const zipBytes = (await stat("artifacts/forest-story-xhs-voice.zip")).size;
if (zipBytes > 10 * 1024 * 1024) errors.push("ZIP 超过 10 MiB");
console.log(JSON.stringify({ fileCount: files.length, zipBytes, audioFiles: mediaExceptions.length, es2017: "通过", audioDecode: "通过", errors, unresolved: ["官方声明支持包内音频，但文件白名单没有列出 MP3。当前配音包保留这些独立音频文件，不能标记为全部规范校验通过。", "创服平台模拟器、Android/iOS 真机播放与 Chrome 61 兼容性待验证。"] }, null, 2));
if (errors.length) process.exitCode = 1;
