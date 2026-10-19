import { z } from "zod";
import type { StoragePort } from "./progress";
export const SETTINGS_KEY = "forest-story.settings.v1";
const schema = z.object({
  narration: z.boolean(),
  volume: z.number().min(0).max(1),
  reducedMotion: z.boolean(),
});
export type Settings = z.infer<typeof schema>;
export const defaultSettings: Settings = {
  narration: true,
  volume: 0.8,
  reducedMotion: false,
};
export const browserStorage: StoragePort = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};
export function loadSettings(): Settings {
  try {
    const raw = browserStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : defaultSettings;
  } catch {
    return defaultSettings;
  }
}
