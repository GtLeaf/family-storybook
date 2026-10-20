// 完整页阅读弹层保留原文与标点，按窄屏容量分段；正文使用独立的滚动区域。
export function captionPages(text: string, limit = 36): string[] {
  const pages: string[] = [];
  let rest = Array.from(text);
  while (rest.length > limit) {
    const candidate = rest.slice(0, limit).join("");
    const sentences = [...candidate.matchAll(/[。！？；]/g)];
    const commas = [...candidate.matchAll(/，/g)];
    const sentenceEnd = sentences.at(-1)?.index;
    const boundary = sentenceEnd !== undefined && sentenceEnd >= limit / 2
      ? sentenceEnd : commas.at(-1)?.index;
    const count = boundary !== undefined && boundary >= limit / 2
      ? Array.from(candidate.slice(0, boundary + 1)).length : limit;
    pages.push(rest.slice(0, count).join(""));
    rest = rest.slice(count);
  }
  if (rest.length) pages.push(rest.join(""));
  return pages.length ? pages : [""];
}
