import { useSyncExternalStore } from "react";

const query = "(max-width: 650px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  if (media.addEventListener) {
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }
  media.addListener(notify);
  return () => media.removeListener(notify);
};
export function useCompactLayout() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
