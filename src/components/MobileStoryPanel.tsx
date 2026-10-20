import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, HelpCircle, Pause, Volume2 } from "lucide-react";

export function MobileStoryCaption({ lines, activeLine, fraction, reducedMotion, feedback, error, onRead }: {
  lines: readonly { speaker: string; text: string }[]; activeLine: number; fraction: number;
  reducedMotion: boolean; feedback: string; error: string; onRead: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const userScrolling = useRef(false);
  const manuallyMoved = useRef(false);
  const touchY = useRef(0);
  const [browsing, setBrowsing] = useState(false);
  const followCurrent = useCallback((behavior: ScrollBehavior) => {
    const box = viewport.current;
    const current = history.current?.children[activeLine];
    if (!box || !(current instanceof HTMLElement)) return;
    const max = box.scrollHeight - box.clientHeight;
    // 长段落从头读起，随录音进度向上推；短段落完整进入视野。
    const top = Math.min(max, current.offsetTop + Math.max(0, current.offsetHeight - box.clientHeight) * fraction);
    userScrolling.current = false;
    box.scrollTo({ top: Math.max(0, top), behavior });
  }, [activeLine, fraction]);

  const latestFollow = useRef(followCurrent);
  useLayoutEffect(() => {
    latestFollow.current = followCurrent;
    if (following.current) followCurrent(reducedMotion ? "instant" : "smooth");
  }, [followCurrent, reducedMotion]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (following.current) latestFollow.current("instant");
    });
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const browse = () => {
    const box = viewport.current;
    if (!box || box.scrollHeight <= box.clientHeight + 1) return;
    if (following.current) manuallyMoved.current = false;
    following.current = false;
    userScrolling.current = true;
    setBrowsing(true);
    // 取消仍在进行的自动滚动，避免拖回当前句。
    box.scrollTo({ top: box.scrollTop, behavior: "instant" });
  };

  return <section className="mobile-caption" aria-label="当前页故事文字">
    <div className="caption-meta">
      <span className="caption-label">这一页</span>
      <span className="caption-position">{activeLine + 1}/{lines.length}</span>
      {browsing && <button className="text-button follow-current" onClick={() => {
        following.current = true; setBrowsing(false); followCurrent("smooth");
      }}>回到当前句<ArrowDown size={13} /></button>}
      <button className="icon-button" aria-label="读完整页" onClick={onRead}><BookOpen size={18} /></button>
    </div>
    <div className="caption-scroll" ref={viewport} tabIndex={0} role="region" aria-label="本页故事，可上下滚动回看"
      onWheel={browse}
      onTouchStart={event => { touchY.current = event.touches[0]?.clientY ?? 0; }}
      onTouchMove={event => {
        if (Math.abs((event.touches[0]?.clientY ?? 0) - touchY.current) > 4) browse();
      }}
      onPointerDown={event => { if (event.pointerType === "mouse") browse(); }}
      onKeyDown={event => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) browse(); }}
      onScroll={() => {
        const box = viewport.current;
        if (!box) return;
        const atBottom = box.scrollHeight - box.clientHeight - box.scrollTop <= 4;
        if (atBottom && (following.current || manuallyMoved.current)) {
          following.current = true; userScrolling.current = false; setBrowsing(false);
        } else if (!atBottom && userScrolling.current) {
          manuallyMoved.current = true;
          following.current = false; setBrowsing(true);
        }
      }}>
      <div className="caption-history" ref={history}>
        {lines.slice(0, activeLine + 1).map((line, index) => <article key={index}
          className={`caption-paragraph ${index === activeLine ? "current-story-line" : "previous-story-line"}`}
          aria-current={index === activeLine ? "true" : undefined}>
          <span className="speaker">{line.speaker}</span><p>{line.text}</p>
        </article>)}
      </div>
    </div>
    {(error || feedback) && <p className={`mobile-feedback ${error ? "audio-notice" : ""}`} role="status">{error || feedback}</p>}
  </section>;
}

export function MobileStoryActions({ nextLabel, disabled, speaking, onNext, onAudio, onHelp }: {
  nextLabel: string; disabled: boolean; speaking: boolean;
  onNext: () => void; onAudio: () => void; onHelp?: () => void;
}) {
  return <div className="mobile-story-actions">
    <button className="text-button mobile-audio-button" aria-label={speaking ? "暂停朗读" : "重听这一段"} onClick={onAudio}>
      {speaking ? <Pause size={19} /> : <Volume2 size={19} />}{speaking ? "暂停" : "重听"}
    </button>
    {onHelp && <button className="icon-button" aria-label="帮帮我" onClick={onHelp}><HelpCircle size={21} /></button>}
    <button className="primary-button" disabled={disabled} onClick={onNext}>{nextLabel}<ArrowRight size={18} /></button>
  </div>;
}
