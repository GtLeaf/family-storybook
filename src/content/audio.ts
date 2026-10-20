import { RESPONSES, STORY, type CompanionChoice, type Stage } from "./story";

import { urls, sentenceUrls } from "./audioAssets";
export type NarrationClip = `v2_${Stage}_${number}` | `v2_response_${CompanionChoice}_${number}`;
export function storyLines(stage: Stage, choice: CompanionChoice | null) {
  return stage === "response" ? RESPONSES[choice ?? "listen"] : STORY[stage].lines;
}
export function lineAudio(stage: Stage, choice: CompanionChoice | null, line: number): NarrationClip {
  return stage === "response" ? `v2_response_${choice ?? "listen"}_${line}` : `v2_${stage}_${line}`;
}
export function narrationAudio(stage: Stage, choice: CompanionChoice | null): NarrationClip[] {
  return storyLines(stage, choice).map((_, i) => lineAudio(stage, choice, i));
}

export type AudioClip =
  | NarrationClip
  | `ui_find_${"cup" | "napkin" | "basket" | "hint"}`
  | `ui_choice_${CompanionChoice}`
  | "ui_stone_placed"
  | `ui_seat_${"select" | "placed"}_${"bear" | "pig" | "donkey"}`
  | `ui_decoration_${"added" | "removed"}`
  | "ui_voice_preview"
  | "optional_stones_complete"
  | "optional_offline_invitation";

export type AudioSequence = AudioClip | readonly AudioClip[];

export function audioUrl(clip: AudioClip): string | undefined {
  return clip.startsWith("v2_")
    ? sentenceUrls[`../../audio/tts/v2/${clip}.mp3`]
    : sentenceUrls[`../../audio/tts/v2/${clip}.mp3`] ?? urls[`../../audio/tts/v1/${clip}.mp3`];
}
