import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile, mkdir, readdir, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const out = path.join(root, "dist-xhs");
// 保留语音，用独立 MP3 文件播放。仅为离线交付重编码，不改原始配音。
const audioRoot = path.join(root, "tmp/xhs-package/audio");
await mkdir(audioRoot, { recursive: true });
const audioFiles = [];
for (const version of ["v1", "v2"]) {
  for (const name of (await readdir(`audio/tts/${version}`)).sort()) {
    if (!name.endsWith(".mp3") || (version === "v1" && !/^(ui_|optional_)/.test(name))) continue;
    const source = `audio/tts/${version}/${name}`;
    const target = path.join(audioRoot, name);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", source, "-ac", "1", "-ar", "24000", "-b:a", "64k", "-map_metadata", "-1", target]);
    audioFiles.push({ source, target, name, version });
  }
}
// 使用 Zod 的解释执行路径；移除依赖中不可在容器运行的代码生成器与探测。
const cspPlugin = {
  name: "xhs-offline-contract",
  enforce: "pre",
  resolveId(source, importer) {
    if (source === "./audioAssets" && importer?.endsWith("/src/content/audio.ts")) return "\0xhs-audio-assets";
  },
  async load(id) {
    if (id !== "\0xhs-audio-assets" && !id.endsWith("/src/content/audioAssets.ts")) return;
    const urls = {}, sentences = {};
    for (const audio of audioFiles) {
      const filename = `assets/${audio.name}`;
      this.emitFile({ type: "asset", fileName: filename, source: await readFile(audio.target) });
      (audio.version === "v2" ? sentences : urls)[`../../audio/tts/${audio.version}/${audio.name}`] = `./${filename}`;
    }
    return `export const urls = ${JSON.stringify(urls)}; export const sentenceUrls = ${JSON.stringify(sentences)};`;
  },
  transform(source, id) {
    if (id.endsWith("/zod/v4/core/doc.js")) return "export class Doc { compile() { throw new Error('动态编译已禁用'); } }";
    if (id.endsWith("/zod/v4/core/util.js")) {
      const start = source.indexOf("export const allowsEval =");
      const end = source.indexOf("export function isPlainObject", start);
      if (start < 0 || end < 0) throw new Error("Zod 结构已变化，请重新检查 CSP 适配");
      return source.slice(0, start) + "export const allowsEval = { value: false };\n" + source.slice(end);
    }
    if (id.endsWith("/zod/v4/core/schemas.js")) return source.replace("const jit = !core.globalConfig.jitless;", "const jit = false;");
  },
};
const cssBaseline = {
  postcssPlugin: "xhs-css-baseline",
  Declaration(decl) {
    if (decl.prop === "inset") {
      const values = decl.value.split(/\s+/);
      ["top", "right", "bottom", "left"].forEach((prop, i) => decl.cloneBefore({ prop, value: values[i] ?? values[i % 2] ?? values[0] }));
    }
    if (decl.prop === "gap") decl.cloneBefore({ prop: "grid-gap" });
    if (decl.value.includes("clamp(")) {
      const match = decl.value.match(/^clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/);
      if (match) {
        decl.cloneBefore({ value: match[2] });
        decl.cloneBefore({ prop: "min-" + decl.prop, value: match[1] });
        decl.cloneBefore({ prop: "max-" + decl.prop, value: match[3] });
      }
    }
    if (decl.prop === "translate") decl.cloneBefore({ prop: "transform", value: "translate(" + decl.value.split(/\s+/).join(",") + ")" });
    if (decl.prop === "scale" && decl.value !== "none") {
      // blanket 已有透视 transform，不覆盖；旧内核省略结尾的轻微放大。
      if (!decl.parent.selector?.includes(".blanket")) decl.cloneBefore({ prop: "transform", value: "scale(" + decl.value + ")" });
    }
    if (/^\d+ \d+$/.test(decl.value) && decl.prop === "font-weight") decl.cloneBefore({ value: decl.value.split(" ")[0] });
    if (decl.prop === "overflow" && decl.value === "clip") decl.cloneBefore({ value: "hidden" });
    if (decl.prop === "user-select" || decl.prop === "appearance") decl.cloneBefore({ prop: "-webkit-" + decl.prop });
    // 安全区同时接收平台模拟器注入变量与真机 env。
    if (decl.value.includes("env(safe-area-inset-") && !decl.value.includes("var(--safe-area-inset-")) {
      decl.value = decl.value.replace(/env\((safe-area-inset-[a-z]+),\s*0px\)/g, "var(--$1, env($1, 0px))");
    }
  },
};
await build({
  configFile: false, mode: "xiaohongshu", base: "./", publicDir: false,
  plugins: [cspPlugin, react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  css: { postcss: { plugins: [cssBaseline] } },
  build: {
    outDir: out, emptyOutDir: true, target: ["es2017", "chrome61"],
    cssTarget: "chrome61", cssMinify: false, assetsInlineLimit: 0, modulePreload: false,
    lib: { entry: path.join(root, "src/xhs/main.tsx"), name: "ForestStory", formats: ["iife"], fileName: () => "app.js", cssFileName: "style" },
    minify: true,
  },
});
await cp("public/art", path.join(out, "art"), { recursive: true });
await cp("public/fonts", path.join(out, "fonts"), { recursive: true });
await cp("public/favicon.svg", path.join(out, "favicon.svg"));
await cp("scripts/xhs-compat.js", path.join(out, "compat.js"));
// CSS 位于 ZIP 根目录，本地字体必须相对 ZIP 根目录解析。
const cssFile = path.join(out, "style.css");
await writeFile(cssFile, (await readFile(cssFile, "utf8")).replaceAll('url(/fonts/', 'url(./fonts/').replaceAll('url("/fonts/', 'url("./fonts/'));
const licenses = {};
for (const file of await readdir("public/licenses")) licenses[file] = await readFile(path.join("public/licenses", file), "utf8");
await writeFile(path.join(out, "licenses.json"), JSON.stringify(licenses, null, 2));
await writeFile(path.join(out, "index.html"), `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>一起的小冒险 · 配音版</title><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./style.css"></head>
<body><div id="root">故事正在准备中…</div><script src="./compat.js"></script><script src="./app.js"></script></body></html>\n`);
await mkdir("artifacts", { recursive: true });
// 固定相对条目，ZIP 根目录直接包含 index.html，不收录构建文件夹本身。
execFileSync("python3", ["-c", `from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('dist-xhs')
with ZipFile('artifacts/forest-story-xhs-voice.zip', 'w', ZIP_DEFLATED, compresslevel=9) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file(): z.write(p, p.relative_to(root))
`], { stdio: "inherit" });
console.log("小红书配音版（音频文件白名单待平台确认）：artifacts/forest-story-xhs-voice.zip");
