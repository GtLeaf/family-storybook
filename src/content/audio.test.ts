import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { audioUrl, narrationAudio, storyLines, type AudioClip } from "./audio";
import { STAGE_IDS } from "./story";
import { storyboard } from "./storyboard";

describe("录音交付与页面映射", () => {
  const task = readFileSync(new URL("../../TTS_TASK.md", import.meta.url), "utf8");
  const clips = [...task.matchAll(/### \w+ · (\w+)\.wav/g)].map((match) => match[1]);

  it("旧版 31 段录音及母版保留，未变更的交互反馈继续可用", () => {
    expect(clips).toHaveLength(31);
    for (const clip of clips) {
      if (!clip.startsWith("page_")) expect(audioUrl(clip as AudioClip), clip).toMatch(/\.mp3/);
      for (const ext of ["mp3", "wav"]) {
        expect(existsSync(new URL(`../../audio/tts/v1/${clip}.${ext}`, import.meta.url)), clip)
          .toBe(true);
      }
    }
  });

  it("覆盖每页及两条分支，分支文件互不混用", () => {
    const pageClips = STAGE_IDS.flatMap((stage) => stage === "response"
      ? [narrationAudio(stage, "listen")[0], narrationAudio(stage, "stay")[0]]
      : [narrationAudio(stage, null)[0]]);
    expect(new Set(pageClips).size).toBe(13);
    expect(narrationAudio("response", "listen")).toContain("v2_response_listen_0");
    expect(narrationAudio("response", "stay")).toContain("v2_response_stay_0");
  });

  it("新版所有句子都有与文字一致的独立配音和有效镜头", () => {
    const manifest: { id: string; text: string; speaker: string }[] = JSON.parse(
      readFileSync(new URL("../../audio/tts/v2/manifest.json", import.meta.url), "utf8"),
    );
    for (const stage of STAGE_IDS) {
      for (const choice of stage === "response" ? ["listen", "stay"] as const : [null]) {
        const lines = storyLines(stage, choice);
        const audio = narrationAudio(stage, choice);
        expect(audio.length).toBe(lines.length);
        for (const [i, clip] of audio.entries()) {
          expect(audioUrl(clip), clip).toMatch(/\.mp3/);
          expect(manifest.find(row => row.id === clip), clip).toMatchObject({
            text: lines[i].text, speaker: lines[i].speaker,
          });
          expect(storyboard(stage, choice)[lines[i].shot], clip).toBeDefined();
          expect(existsSync(new URL(`../../audio/tts/v2/${clip}.wav`, import.meta.url))).toBe(true);
        }
      }
    }
  });

  it("开场、寻找与路上不提前出现屹耳，陪伴分支的关系构图不同", () => {
    for (const stage of ["intro", "find", "wind-talk", "walk"] as const)
      expect(storyboard(stage, null).flatMap(shot => shot.actors).some(actor => actor.friend === "donkey")).toBe(false);
    expect(storyboard("response", "listen")[0].actors).not.toEqual(storyboard("response", "stay")[0].actors);
    expect(storyboard("companion-talk", "stay")[0].actors).toEqual(storyboard("response", "stay")[1].actors);
  });
});
