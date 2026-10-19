// 导出台词与重录清单。此处只执行项目自有、无副作用的内容常量。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";

function content(source) {
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports });
  return exports;
}
const current = content(readFileSync("src/content/story.ts", "utf8"));
const old = content(execFileSync("tar", ["-xOf", "docs/archive/v0.3-before-storyboard/source.tar.gz", "src/content/story.ts"], { encoding: "utf8" }));
mkdirSync("audio/tts/v2", { recursive: true });
writeFileSync("audio/tts/v2/script.json", JSON.stringify({ scenes: current.STORY, responses: current.RESPONSES }, null, 2) + "\n");
const rows = [];
const unchanged = [];
for (const [stage, scene] of Object.entries(current.STORY)) {
  const sets = stage === "response"
    ? ["listen", "stay"].map(choice => ({ name: `response_${choice}`, lines: current.RESPONSES[choice], before: old.RESPONSES[choice] }))
    : [{ name: stage, lines: scene.lines, before: old.STORY[stage].lines }];
  for (const set of sets) {
    for (const [i, line] of set.lines.entries()) {
      const id = `v2_${set.name}_${i}`;
      const same = set.before.find(l => l.speaker === line.speaker && l.text === line.text);
      const isCharacter = ["维尼", "小猪", "屹耳"].includes(line.speaker);
      const voice = isCharacter ? line.speaker : "旁白";
      if (same) { unchanged.push(`| ${id} | ${voice} | ${line.text} |`); continue; }
      const previous = set.before.find(l => l.speaker === line.speaker)
        ?? (!isCharacter ? set.before.find(l => !["维尼", "小猪", "屹耳"].includes(l.speaker)) : undefined);
      rows.push(`| ${id} | ${voice} | ${previous?.text ?? "新增"} | ${line.text} |`);
    }
  }
}
const deliveryNote = existsSync("audio/tts/v2/delivery_manifest.md")
  ? "> 正式录音已接入，当前交付状态及待补台词见 [v2 配音交付记录](../audio/tts/v2/delivery_manifest.md)。以下为脚本文字对照，不代表仍需全部重录。\n\n"
  : "";
writeFileSync("docs/09-新版配音变更与重录清单.md", `# 新版配音变更与重录清单

${deliveryNote}日期：2026-10-20。适用：v0.4 分镜版。

## 录制和替换

新版正文按句接入，所有文件位于 audio/tts/v2；v1 原录音完整保留。正式交付与待补状态以 manifest.json 和上方交付记录为准。请继续使用原先确认的四个正式音色，角色前缀不读出。

每个编号单独录制，文件名与表格一致，交付 WAV 母版和 MP3。建议 48 kHz、单声道、16 bit WAV，干净人声，无音乐和音效；句首尾保留自然短停顿，四角色听感音量一致，避免削波。原屹耳音量较低的问题请一并复查。

直接替换同名 MP3 后重新构建即可；镜头跟随音频播放和结束事件，不依赖固定秒数，无须保持临时版的语速和时长。合成校验数据在 manifest.json，正式音色与交付信息也应更新在那里；文字源以 src/content/story.ts 为准。页面标题暂不包含在逐句录音中。

## 需要变更的正文：${rows.length} 句

| 文件名（不含扩展名） | 角色 | 原句 | 新句 |
|---|---|---|---|
${rows.join("\n")}

## 文字未变的正文：${unchanged.length} 句

这些句子可以从原始分角色录音或母版中复用；若只有整页录音，请在自然句边界导出为以下逐句文件。缺词的旧录音不能当成完整台词复用，具体状态见交付记录。

| 文件名（不含扩展名） | 角色 | 正文 |
|---|---|---|
${unchanged.join("\n")}

## 交互语音变更：3 段

| 文件名 | 角色 | 原句 | 新句 |
|---|---|---|---|
| ui_choice_listen | 旁白 | 先听他说说。你愿意告诉我，最担心什么吗？ | 先听他说说。你愿意告诉我们，最担心什么吗？ |
| ui_choice_stay | 旁白 | 在旁边陪一会儿。不用着急，我就在这里。 | 在旁边陪一会儿。不用着急，我们就在这里。 |
| optional_stones_complete | 屹耳 | 现在看起来，好像可以坐一会儿了。 | 现在看起来，好像可以安心待一会儿了。 |

以上 3 段也放入 v2，优先于旧版同名录音使用。其余寻物、放石头、座位和装饰反馈继续复用 v1。日记不再自动接播离屏活动邀请，活动文字仍保留。

## 临时配音的生成

执行 node scripts/export-storyboard.mjs 导出正文和本清单。早期临时录音由 python3 scripts/prepare-storyboard-audio.py 使用 macOS 本地声音与 ffmpeg 生成，不访问外部配音服务。检测到正式录音后该生成器会停止，防止覆盖正式成品。
`);
console.log(`导出 ${rows.length} 句变更、${unchanged.length} 句保留正文，以及 3 段交互重录清单。`);
