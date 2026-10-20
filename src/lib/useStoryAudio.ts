import { useCallback, useEffect, useRef, useState } from "react";
import { audioUrl, type AudioSequence } from "../content/audio";

type AudioStatus = "idle" | "speaking" | "unavailable";
export type AudioCues = {
  onClip?: (index: number) => void;
  onProgress?: (index: number, fraction: number) => void;
  onComplete?: () => void;
};

export function useStoryAudio(volume: number) {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState("");
  const player = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const currentVolume = useRef(volume);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);

  const release = useCallback(() => {
    generation.current += 1;
    clearWatchdog();
    const audio = player.current;
    if (!audio) return;
    audio.onplaying = null;
    audio.onwaiting = null;
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, [clearWatchdog]);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
    setError("");
  }, [release]);

  const play = useCallback((sequence: AudioSequence, cues?: AudioCues) => {
    stop();
    const clips = typeof sequence === "string" ? [sequence] : sequence;
    if (!clips.length) return;
    const audio = player.current ?? new Audio();
    player.current = audio;
    audio.preload = "auto";
    audio.volume = currentVolume.current;
    const token = generation.current;

    const fail = (message: string) => {
      if (token !== generation.current) return;
      release();
      setStatus("unavailable");
      setError(message);
    };
    const waitForAudio = () => {
      clearWatchdog();
      watchdog.current = setTimeout(() => fail(
        "声音加载得有点慢。可以点朗读按钮再试，也可以接着读文字。",
      ), 15000);
    };
    const next = (index: number) => {
      if (token !== generation.current) return;
      if (index === clips.length) {
        stop();
        cues?.onComplete?.();
        return;
      }
      const url = audioUrl(clips[index]);
      if (!url) {
        fail("这一段声音暂时找不到。文字都在这里，你们可以接着读。");
        return;
      }
      audio.onplaying = () => {
        if (token !== generation.current) return;
        clearWatchdog();
        setStatus("speaking");
        cues?.onClip?.(index);
      };
      audio.onwaiting = waitForAudio;
      audio.ontimeupdate = () => {
        if (token === generation.current && Number.isFinite(audio.duration) && audio.duration > 0)
          cues?.onProgress?.(index, audio.currentTime / audio.duration);
      };
      audio.onended = () => {
        if (token !== generation.current) return;
        clearWatchdog();
        next(index + 1);
      };
      audio.onerror = () => fail(
        "声音暂时无法播放。可以点朗读按钮再试，或切换“家长读”继续。",
      );
      audio.src = url;
      // 加载期间也可取消；旧播放请求的异步结果不能覆盖新一段的状态。
      setStatus("speaking");
      waitForAudio();
      void audio.play().catch((cause: unknown) => {
        if (token !== generation.current) return;
        fail(cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "浏览器需要你点一下才能播放声音。请点朗读按钮，再一起听故事。"
          : "声音暂时无法播放。可以点朗读按钮再试，或切换“家长读”继续。");
      });
    };
    next(0);
  }, [clearWatchdog, release, stop]);

  useEffect(() => {
    currentVolume.current = volume;
    if (player.current) player.current.volume = volume;
  }, [volume]);

  useEffect(() => release, [release]);
  return { play, stop, status, error };
}
