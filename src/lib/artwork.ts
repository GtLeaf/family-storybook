import { FRIENDS, STAGE_IDS, STORY, type Art, type Friend, type Stage } from "../content/story";

type Artwork = Art | Friend;
type WarmImage = { image: HTMLImageElement; ready: Promise<boolean> };
const images = new Map<string, WarmImage>();

// 背景、SVG 前景与预加载必须使用相同 URL，才能复用同一份浏览器缓存。
export function artworkUrl(art: Artwork, attempt = 0): string {
  return `${import.meta.env.BASE_URL}art/${art}.webp?v=mobile-1${attempt ? `&retry=${attempt}` : ""}`;
}

export function sceneArtwork(stage: Stage): Artwork[] {
  const friends = STAGE_IDS.indexOf(stage) < STAGE_IDS.indexOf("worry")
    ? ["bear", "pig"] as const : FRIENDS;
  return [STORY[stage].art, ...friends];
}

export function upcomingArtwork(stage: Stage): Artwork[] {
  const backgrounds = new Set<Art>([STORY[stage].art]);
  const upcoming: Artwork[] = [];
  for (const next of STAGE_IDS.slice(STAGE_IDS.indexOf(stage) + 1)) {
    if (backgrounds.has(STORY[next].art)) continue;
    backgrounds.add(STORY[next].art);
    upcoming.push(...sceneArtwork(next));
    if (backgrounds.size === 3) break;
  }
  const current = new Set(sceneArtwork(stage));
  return [...new Set(upcoming)].filter(art => !current.has(art));
}

function warmImage(art: Artwork, priority: "high" | "low"): Promise<boolean> {
  const url = artworkUrl(art);
  const cached = images.get(url);
  if (cached) {
    if (priority === "high") cached.image.fetchPriority = "high";
    return cached.ready;
  }
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority;
  const ready = new Promise<boolean>(resolve => {
    const failed = () => {
      // 预取失败不阻止翻页；清理本次记录，当前页仍可重新请求或手动重试。
      images.delete(url);
      resolve(false);
    };
    image.onerror = failed;
    image.onload = () => { void image.decode().then(() => resolve(true), failed); };
  });
  images.set(url, { image, ready });
  image.src = url;
  return ready;
}

export async function preloadArtwork(artworks: Artwork[], {
  priority = "low", signal,
}: { priority?: "high" | "low"; signal?: AbortSignal } = {}): Promise<void> {
  const unique = [...new Set(artworks)];
  // 分批取图与解码；切页后停止旧计划的后续批次，已在加载的图继续供缓存复用。
  for (let i = 0; i < unique.length && !signal?.aborted; i += 2) {
    await Promise.all(unique.slice(i, i + 2).map(art => warmImage(art, priority)));
  }
}
