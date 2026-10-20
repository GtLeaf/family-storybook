// 直接引用交付目录，由 Vite 生成适用于静态托管子目录的资源地址。
export const urls = import.meta.glob<string>(["../../audio/tts/v1/ui_*.mp3", "../../audio/tts/v1/optional_*.mp3"], {
  eager: true,
  query: "?url",
  import: "default",
});
export const sentenceUrls = import.meta.glob<string>("../../audio/tts/v2/*.mp3", {
  eager: true, query: "?url", import: "default",
});
