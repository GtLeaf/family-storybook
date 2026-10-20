import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Ear,
  Heart,
  HelpCircle,
  Leaf,
  LibraryBig,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Volume2,
} from "lucide-react";
import {
  FRIEND_NAMES,
  ITEM_NAMES,
  ITEMS,
  STORY,
  type CompanionChoice,
} from "./content/story";
import {
  canAdvance,
  clearProgress,
  loadProgress,
  newProgress,
  reduceProgress,
  saveProgress,
  type Action,
} from "./lib/progress";
import {
  browserStorage,
  loadSettings,
  SETTINGS_KEY,
  type Settings,
} from "./lib/settings";
import { narrationAudio, storyLines, type AudioSequence } from "./content/audio";
import { useStoryAudio, type AudioCues } from "./lib/useStoryAudio";
import { preloadArtwork, sceneArtwork, upcomingArtwork } from "./lib/artwork";
import {
  BotanicalSprig,
  Prop,
} from "./components/Illustrations";
import { SceneArt } from "./components/SceneArt";
import { FindBoard, PicnicBoard } from "./components/GameBoard";
import { Dialog } from "./components/Dialog";
import { StoryScene } from "./components/StoryScene";
import { storyboard } from "./content/storyboard";
import { captionPages } from "./lib/captions";
import { useCompactLayout } from "./lib/useCompactLayout";
import { CompanionChoices } from "./components/CompanionChoices";
import { MobileStoryCaption, MobileStoryActions } from "./components/MobileStoryPanel";

type Screen = "home" | "story" | "settings";
type Confirmation = "restart" | "clear" | "invalid" | null;

export default function App() {
  const [loaded] = useState(() => loadProgress(browserStorage));
  const [progress, setProgress] = useState(loaded.progress ?? newProgress);
  const [hasSave, setHasSave] = useState(Boolean(loaded.progress));
  const [canSave, setCanSave] = useState(loaded.status !== "invalid");
  const [screen, setScreen] = useState<Screen>("home");
  const [settings, setSettings] = useState(loadSettings);
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation>(null);
  const [selectedChoice, setSelectedChoice] = useState<CompanionChoice | null>(
    null,
  );
  const [hint, setHint] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [storageNotice, setStorageNotice] = useState(
    loaded.status === "invalid"
      ? "这份进度暂时读不出来，原记录已保留。重新开始前会请你确认。"
      : loaded.status === "recovered"
        ? "已从上一份备份恢复进度，可能需要重做刚才的小操作。"
        : loaded.status === "unavailable"
          ? "这个浏览器暂时不能保存进度，仍然可以玩完整个故事。"
          : "",
  );
  const [busy, setBusy] = useState(false);
  const compact = useCompactLayout();
  // 新场景首帧就使用自己的游标，避免上一幕的末句短暂成为下一幕的翻页按钮。
  const [cursor, setCursor] = useState({ stage: progress.stage, choice: progress.choice, line: 0, fraction: 0 });
  const sameScene = cursor.stage === progress.stage && cursor.choice === progress.choice;
  const activeLine = sameScene ? cursor.line : 0;
  const narrationFraction = sameScene ? cursor.fraction : 0;
  const setActiveLine = useCallback((line: number) => setCursor(previous => ({
    stage: progress.stage, choice: progress.choice, line,
    fraction: previous.stage === progress.stage && previous.choice === progress.choice && previous.line === line ? previous.fraction : 0,
  })), [progress.stage, progress.choice]);
  const setNarrationProgress = useCallback((line: number, fraction: number) => setCursor({
    stage: progress.stage, choice: progress.choice, line, fraction,
  }), [progress.stage, progress.choice]);
  const [readingPage, setReadingPage] = useState<number | null>(null);
  const [diaryDetail, setDiaryDetail] = useState<number | null>(null);
  const [settingsTab, setSettingsTab] = useState("comfort");
  const [narrating, setNarrating] = useState(false);
  const returnScreen = useRef<Screen>("home");
  const narrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationStart = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isDiary = progress.stage === "diary";
  const scene = STORY[progress.stage];
  const lines = useMemo(() => storyLines(progress.stage, progress.choice), [progress.stage, progress.choice]);
  const lineIndex = Math.min(activeLine, lines.length - 1);
  const currentLine = lines[lineIndex];
  const hasMoreLine = lineIndex < lines.length - 1;
  const transcript = lines.flatMap(line => captionPages(line.text).map(text => ({ speaker: line.speaker, text })));
  const shots = storyboard(progress.stage, progress.choice);
  const shotIndex = currentLine.shot;
  const narrationClips = useMemo(() => narrationAudio(progress.stage, progress.choice), [progress.stage, progress.choice]);
  const {
    play: playRecording,
    stop: stopRecording,
    status: speechStatus,
    error: speechError,
  } = useStoryAudio(settings.volume);
  const stop = useCallback(() => {
    if (narrationTimer.current) clearTimeout(narrationTimer.current);
    narrationTimer.current = null;
    setNarrating(false);
    stopRecording();
  }, [stopRecording]);
  const play = useCallback((audio: AudioSequence, cues?: AudioCues) => {
    // 用户开始操作后，取消尚未启动的自动正文，避免它打断交互反馈。
    if (narrationTimer.current) {
      clearTimeout(narrationTimer.current);
      narrationTimer.current = null;
    }
    playRecording(audio, cues);
  }, [playRecording]);
  const playNarration = useCallback((start = 0) => {
    setActiveLine(start);
    setNarrationProgress(start, 0);
    setNarrating(true);
    play(narrationClips.slice(start), {
      onClip: (index) => setNarrationProgress(start + index, 0),
      onProgress: (index, fraction) => setNarrationProgress(start + index, fraction),
      onComplete: () => setNarrating(false),
    });
  }, [narrationClips, play, setActiveLine, setNarrationProgress]);
  const dispatch = useCallback(
    (action: Action) => setProgress((p) => reduceProgress(p, action)),
    [],
  );

  useEffect(() => {
    if (hasSave && canSave && !saveProgress(browserStorage, progress))
      setStorageNotice(
        "这次进度暂时无法保存。故事可以继续，关闭页面后可能需要重新开始。",
      );
  }, [progress, hasSave, canSave]);
  useEffect(() => {
    try {
      browserStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      setStorageNotice("浏览器暂时无法记住设置和进度。你仍然可以继续体验。");
    }
  }, [settings]);
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        stop();
        if (screen === "story" && !isDiary) setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [screen, isDiary, stop]);
  useEffect(() => {
    stop();
    if (
      screen !== "story" ||
      paused ||
      confirm ||
      !settings.narration
    )
      return;
    const start = narrationStart.current ?? 0;
    narrationStart.current = null;
    const timer = setTimeout(() => playNarration(start), 120);
    narrationTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (narrationTimer.current === timer) narrationTimer.current = null;
      stop();
    };
  }, [
    playNarration,
    screen,
    paused,
    confirm,
    settings.narration,
    isDiary,
    stop,
  ]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setSelectedChoice(progress.stage === "choice" ? progress.choice : null);
    setHint(0);
    setFeedbackText("");
    setActiveLine(0);
    setNarrationProgress(0, 0);
    setReadingPage(null);
    setDiaryDetail(null);
    narrationStart.current = null;
    setNarrating(false);
    setBusy(true);
    const timer = setTimeout(() => {
      setBusy(false);
      headingRef.current?.focus({ preventScroll: true });
    }, 320);
    return () => clearTimeout(timer);
  }, [progress.stage, progress.choice, screen, setActiveLine, setNarrationProgress]);
  useEffect(() => {
    if (
      screen !== "story" ||
      progress.stage !== "find" ||
      progress.found.length === 3 ||
      paused ||
      speechStatus === "speaking" ||
      hint > 0
    )
      return;
    const timer = setTimeout(() => setHint(1), 12000);
    return () => clearTimeout(timer);
  }, [
    screen,
    progress.stage,
    progress.found.length,
    paused,
    speechStatus,
    hint,
  ]);
  useEffect(() => {
    if (screen !== "home" && screen !== "story") return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      // 先让当前画面完成，再利用封面停留/阅读时间准备下一幕。
      await preloadArtwork(screen === "home" ? ["cover"] : sceneArtwork(progress.stage), { priority: "high", signal });
      await preloadArtwork(screen === "home"
        ? [...sceneArtwork(progress.stage), ...sceneArtwork("intro")]
        : upcomingArtwork(progress.stage), { signal });
    })();
    return () => controller.abort();
  }, [screen, progress.stage]);

  const feedback = (text: string, audio: AudioSequence) => {
    setFeedbackText(text);
    setNarrating(false);
    if (settings.narration) play(audio);
  };
  const goHome = () => {
    stop();
    setPaused(false);
    setScreen("home");
  };
  const openSettings = () => {
    if (screen === "settings") return;
    returnScreen.current = screen;
    stop();
    setPaused(false);
    setSettingsTab("comfort");
    setScreen("settings");
  };
  const begin = () => {
    if (!canSave) {
      setConfirm("invalid");
      return;
    }
    setHasSave(true);
    setPaused(false);
    setScreen("story");
  };
  const selectCompanion = (choice: CompanionChoice) => {
    setSelectedChoice(choice);
    setNarrating(false);
    if (settings.narration) play(`ui_choice_${choice}`);
  };
  const advanceLine = () => {
    stop();
    if (hasMoreLine) {
      if (settings.narration) playNarration(lineIndex + 1);
      else setActiveLine(lineIndex + 1);
    }
  };
  const nextMobile = () => {
    if (hasMoreLine) advanceLine();
    else if (progress.stage === "choice" && selectedChoice)
      dispatch({ type: "CHOOSE", choice: selectedChoice });
    else if (canAdvance(progress)) dispatch({ type: "NEXT", from: progress.stage });
  };
  const taskReminder = progress.stage === "find"
    ? `还差 ${3 - progress.found.length} 件野餐用品`
    : progress.stage === "stones" ? "把剩下的垫角也压一压吧"
      : `还有 ${progress.seats.filter(seat => !seat).length} 位朋友等着入座`;
  const nextMobileLabel = hasMoreLine ? "继续讲"
    : progress.stage === "choice" ? selectedChoice ? scene.next : "先选一种陪伴方式"
      : canAdvance(progress) ? scene.next : taskReminder;
  const nextMobileDisabled = busy || (!(hasMoreLine) &&
    (progress.stage === "choice" ? !selectedChoice : !canAdvance(progress)));
  const changeSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));
  const restart = () => {
    setProgress(newProgress());
    setCanSave(true);
    setHasSave(true);
    setConfirm(null);
    setPaused(false);
    setScreen("story");
    setStorageNotice("");
  };
  const title =
    confirm === "clear"
      ? "清除这本故事的记录？"
      : confirm === "invalid"
        ? "重新开始这次冒险？"
        : "从头再玩一次？";

  return (
    <div className={`app screen-${screen} ${settings.reducedMotion ? "reduce-motion" : ""} ${paused ? "story-paused" : ""}`}>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={() => {
            if (screen === "story" && !isDiary) setPaused(true);
            else goHome();
          }}
          aria-label="一起的小冒险，返回书架"
        >
          <span className="brand-mark">
            <Sprout size={22} />
          </span>
          <span>
            一起的小冒险<small>A LITTLE ADVENTURE, TOGETHER</small>
          </span>
        </button>
        <button className="parent-link" onClick={openSettings}>
          <Settings2 size={17} />
          <span>家长小角落</span>
        </button>
      </header>

      {screen === "home" && (
        <main className="home-page">
          <div className="home-intro">
            <span className="eyebrow">
              <span /> 把一点时间，留给彼此
            </span>
            <h1>
              小小的故事，
              <br />
              <span>一起的大冒险。</span>
            </h1>
            <p>
              和孩子走进森林，听一听、找一找，
              <br className="mobile-break" />
              让平凡的一天，长出一点不平凡。
            </p>
            <BotanicalSprig className="intro-sprig" />
          </div>
          <article className="book-cover">
            <div className="cover-art-wrap">
              <SceneArt
                art="cover"
                alt="森林里，维尼、小猪和屹耳站在野餐垫旁"
                className="cover-art"
                priority
              />
              <span className="chapter-tag">
                森林故事集 <i> / </i> 01
              </span>
              <span className="cover-stamp">
                一起玩
                <br />
                <b>一起长大</b>
              </span>
            </div>
            <div className="book-information">
              <span className="eyebrow">第一章 · 关于陪伴与小小的改变</span>
              <h2>风吹走的野餐</h2>
              <p>
                风把野餐吹乱了。没关系，
                <br />
                我们可以一起，把好心情找回来。
              </p>
              <div className="book-meta">
                <span>
                  <Sprout size={16} />
                  4—7 岁亲子共玩
                </span>
                <span>
                  <Clock3 size={16} />
                  慢慢玩，不着急
                </span>
              </div>
              <div className="reading-toggle" role="group" aria-label="阅读方式">
                <button
                  aria-pressed={settings.narration}
                  className={settings.narration ? "active" : ""}
                  onClick={() => changeSetting("narration", true)}
                >
                  <Volume2 size={16} />
                  听故事
                </button>
                <button
                  aria-pressed={!settings.narration}
                  className={!settings.narration ? "active" : ""}
                  onClick={() => changeSetting("narration", false)}
                >
                  <BookOpen size={16} />
                  家长读
                </button>
              </div>
              <button className="primary-button start-button" onClick={begin}>
                <span>
                  {hasSave
                    ? isDiary
                      ? "看看我们的日记"
                      : "继续这次小冒险"
                    : "开始一起玩"}
                </span>
                <ArrowRight size={20} />
              </button>
              {hasSave && (
                <div className="saved-note">
                  <Check size={14} />
                  {isDiary
                    ? "这段美好，已经留在故事里"
                    : `上次读到：${scene.title}`}
                  <button onClick={() => setConfirm("restart")}>从头玩</button>
                </div>
              )}
              {!hasSave && (
                <p className="under-button">不用准备什么，带上好奇心就好。</p>
              )}
            </div>
          </article>
          {storageNotice && (
            <p className="notice" role="status">
              {storageNotice}
            </p>
          )}
          <section className="little-promises" aria-label="共玩的三个小约定">
            <div>
              <Ear />
              <span>
                <b>听一个温柔的故事</b>
                <small>让想象慢慢发生</small>
              </span>
            </div>
            <div>
              <Heart />
              <span>
                <b>一起做几个小决定</b>
                <small>每种陪伴都有意义</small>
              </span>
            </div>
            <div>
              <Leaf />
              <span>
                <b>把美好带回生活</b>
                <small>故事结束，陪伴继续</small>
              </span>
            </div>
          </section>
          <footer className="home-footer">
            <span className="footer-line" />
            <span>没有输赢，只有我们在一起。</span>
            <Sprout size={18} />
            <span className="footer-line" />
          </footer>
        </main>
      )}

      {screen === "story" && (
        <main className={`story-page ${isDiary ? "diary-page" : ""}`}>
          <nav className="story-toolbar" aria-label="故事操作">
            <button
              className="text-button"
              disabled={busy || progress.stage === "intro"}
              onClick={() => {
                stop();
                dispatch({ type: "PREVIOUS", from: progress.stage });
              }}
            >
              <ArrowLeft size={18} />上一页
            </button>
            <span className="mobile-scene-label">第 {scene.chapter} 幕 · {scene.location}</span>
            <div className="chapter-progress" role="img" aria-label={`第 ${scene.chapter} 幕，共 3 幕`}>
              {[1, 2, 3].map(n => <span key={n} className={scene.chapter >= n ? "active" : ""} />)}
            </div>
            <button className="text-button bookshelf-button" onClick={goHome}>
              <LibraryBig size={18} />书架
            </button>
            <button className="icon-button" aria-label="更多" title="更多操作与暂停" aria-haspopup="dialog"
              onClick={() => { narrationStart.current = lineIndex; stop(); setPaused(true); }}>
              <MoreHorizontal size={21} />
            </button>
          </nav>
          {isDiary ? (
            <>
              <div className="diary-heading">
                <span className="eyebrow">
                  <Sprout size={15} /> 收好这一天的小美好
                </span>
                <h1 ref={headingRef} tabIndex={-1}>
                  我们的小小野餐
                </h1>
                <p>有朋友在的地方，就是好地方。</p>
              </div>
              <article className="diary-sheet">
                <span className="tape tape-left" />
                <span className="tape tape-right" />
                <PicnicBoard
                  progress={progress}
                  dispatch={dispatch}
                  feedback={feedback}
                  readOnly
                  still
                />
                <div className="diary-writing">
                  <span className="eyebrow">冒险日记 · 第一页</span>
                  <h2>今天，我们一起做到了</h2>
                  <p>{scene.lines[0].text}</p>
                  <div className="diary-friends">
                    {progress.seats.map(
                      (friend, i) =>
                        friend && (
                          <span key={i}>
                            {FRIEND_NAMES[friend]}
                            <small>座位 {i + 1}</small>
                          </span>
                        ),
                    )}
                  </div>
                  {compact && <button className="text-button" onClick={() => { stop(); setDiaryDetail(0); }}>读读这次的日记 <BookOpen size={16} /></button>}
                  <span className="diary-seal">
                    <Check size={17} />
                    一起完成
                  </span>
                </div>
              </article>
              <div className="offline-invitation">
                <Leaf size={23} />
                <div>
                  <h3>接下来，去生活里玩吧</h3>
                  <p>
                    在家里找一个舒服的角落，用手边安全的小物件摆场野餐。也可以改天再玩。
                  </p>
                </div>
              </div>
              <div className="diary-actions">
                <button className="text-button" onClick={() => {
                  if (speechStatus === "speaking") stop();
                  else playNarration();
                }}>
                  {speechStatus === "speaking" ? <Pause size={16} /> : <Volume2 size={16} />}
                  {speechStatus === "speaking" ? "暂停朗读" : "听这一段"}
                </button>
                <button className="primary-button" onClick={goHome}>
                  把美好放回书架
                  <BookOpen size={18} />
                </button>
                <button
                  className="text-button"
                  onClick={() => dispatch({ type: "REARRANGE" })}
                >
                  <RotateCcw size={16} />
                  再摆一次野餐
                </button>
              </div>
              {speechError && <p className="audio-notice" role="status">{speechError}</p>}
            </>
          ) : (
            <>
              {!compact && <div className="scene-title">
                <span className="eyebrow">
                  {String(scene.chapter).padStart(2, "0")} / {scene.location}
                </span>
                <h1 ref={headingRef} tabIndex={-1}>
                  {scene.title}
                </h1>
              </div>}
              <div className={`story-spread stage-${progress.stage}`}>
                <div className="stage-viewport">
                <div className="scene-visual">
                  {compact && <h1 className="mobile-stage-title" ref={headingRef} tabIndex={-1}>{scene.title}</h1>}
                  {progress.stage === "find" ? (
                    <FindBoard
                      progress={progress}
                      dispatch={dispatch}
                      feedback={feedback}
                      hint={hint}
                      still={paused || settings.reducedMotion}
                    />
                  ) : ["stones", "picnic", "ending"].includes(
                      progress.stage,
                    ) ? (
                    <PicnicBoard
                      key={progress.stage}
                      progress={progress}
                      dispatch={dispatch}
                      feedback={feedback}
                      stones={progress.stage === "stones"}
                      shot={shotIndex}
                      speaker={currentLine.speaker}
                      speaking={narrating && speechStatus === "speaking"}
                      still={paused || settings.reducedMotion}
                      readOnly={progress.stage === "ending"}
                    />
                  ) : (
                    <StoryScene key={progress.stage} stage={progress.stage} choice={progress.choice}
                      shot={shotIndex} speaker={currentLine.speaker}
                      speaking={narrating && speechStatus === "speaking"}
                      still={settings.reducedMotion} />
                  )}
                  {progress.stage === "find" && (
                    <div className="found-tray">
                      {ITEMS.map((item) => (
                        <span
                          key={item}
                          className={
                            progress.found.includes(item) ? "collected" : ""
                          }
                        >
                          <Prop item={item} />
                          {ITEM_NAMES[item]}
                          {progress.found.includes(item) && <Check size={14} />}
                        </span>
                      ))}
                      <b>{progress.found.length} / 3</b>
                    </div>
                  )}
                  {progress.stage === "stones" && (
                    <div className="task-count">
                      <Check size={17} />
                      {progress.stones.length === 3
                        ? "每个垫角都稳稳的了"
                        : `已经固定 ${progress.stones.length} 个垫角，还有 ${3 - progress.stones.length} 个`}
                    </div>
                  )}
                </div>
                </div>
                {compact && <div className="mobile-reading-area">
                  <MobileStoryCaption key={`${progress.stage}-${progress.choice}`}
                    lines={lines} activeLine={lineIndex} fraction={narrationFraction}
                    reducedMotion={settings.reducedMotion}
                    feedback={feedbackText || scene.instruction || (progress.stage.endsWith("talk") ? "聊多久都可以，也可以直接继续。" : "")}
                    error={speechError} onRead={() => { stop(); setReadingPage(0); }}
                  />
                  {progress.stage === "choice" && <CompanionChoices selected={selectedChoice} onSelect={selectCompanion} />}
                </div>}
                {compact ? <MobileStoryActions
                  nextLabel={nextMobileLabel} disabled={nextMobileDisabled}
                  speaking={speechStatus === "speaking"} onNext={nextMobile}
                  onAudio={() => { if (speechStatus === "speaking") stop(); else playNarration(lineIndex); }}
                  onHelp={progress.stage === "find" && progress.found.length < 3 ? () => {
                    setHint(n => Math.min(n + 1, 2));
                    feedback("看看发亮的轮廓，小东西就藏在那里。", "ui_find_hint");
                  } : undefined}
                /> : <div className="story-reading">
                  {progress.stage.endsWith("talk") && (
                    <div className="talk-label">
                      <Heart size={17} /> 这一页，留给你们的声音
                    </div>
                  )}
                  <div className="story-lines">
                    <div className="story-line current-story-line" key={`${progress.stage}-${lineIndex}`}>
                      <span className="speaker">{currentLine.speaker}</span>
                      <p>{currentLine.text}</p>
                    </div>
                  </div>
                  <div className="story-beats" aria-label="这一幕的讲述">
                    <span className="beat-progress">{String(shotIndex + 1).padStart(2, "0")} / {String(shots.length).padStart(2, "0")}</span>
                    {lineIndex < lines.length - 1 ? <>
                      <button className="text-button" onClick={() => {
                        stop();
                        setNarrating(false);
                        if (settings.narration) playNarration(lineIndex + 1);
                        else setActiveLine(lineIndex + 1);
                      }}>继续讲 <ChevronRight size={16} /></button>
                      <button className="text-button quiet-button" onClick={() => {
                        stop(); setNarrating(false); setActiveLine(lines.length - 1);
                      }}>看完整画面</button>
                    </> : <button className="text-button" onClick={() => {
                      stop(); setNarrating(false);
                      if (settings.narration) playNarration(); else setActiveLine(0);
                    }}><RotateCcw size={14} /> 重看这一幕</button>}
                  </div>
                  {lines.length > 1 && <details className="page-transcript">
                    <summary>读完整页</summary>
                    {lines.map((line, i) => <p key={i}><b>{line.speaker}：</b>{line.text}</p>)}
                  </details>}
                  {progress.stage.endsWith("talk") && (
                    <p className="gentle-note">
                      聊多久都可以，也可以直接继续。
                    </p>
                  )}
                  {progress.stage === "choice" && <CompanionChoices selected={selectedChoice} onSelect={selectCompanion} />}
                  {progress.stage === "stones" &&
                    progress.stones.length === 3 && (
                      <p className="completion-quote">
                        屹耳：“现在看起来，好像可以安心待一会儿了。”
                      </p>
                    )}
                  <div
                    className="feedback-line"
                    role="status"
                    aria-live="polite"
                  >
                    {feedbackText ||
                      (scene.instruction && (
                        <>
                          <Sparkles size={15} />
                          {scene.instruction}
                        </>
                      ))}
                  </div>
                  {speechError && (
                    <p className="audio-notice" role="status">
                      {speechError}
                    </p>
                  )}
                  <div className="scene-controls">
                    {progress.stage === "choice" ? (
                      <button
                        className="primary-button"
                        disabled={!selectedChoice || busy}
                        onClick={() =>
                          selectedChoice &&
                          dispatch({ type: "CHOOSE", choice: selectedChoice })
                        }
                      >
                        {selectedChoice ? scene.next : "先选一种陪伴方式"}
                        <ArrowRight size={18} />
                      </button>
                    ) : canAdvance(progress) ? (
                      <button
                        className="primary-button"
                        disabled={busy}
                        onClick={() =>
                          dispatch({ type: "NEXT", from: progress.stage })
                        }
                      >
                        {scene.next}
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <p className="task-reminder">
                        {progress.stage === "find"
                          ? `还差 ${3 - progress.found.length} 件野餐用品`
                          : progress.stage === "stones"
                            ? "把剩下的垫角也压一压吧"
                            : `还有 ${progress.seats.filter((seat) => !seat).length} 位朋友等着入座`}
                      </p>
                    )}
                    <div className="secondary-controls">
                      <button
                        className="text-button"
                        onClick={() => {
                          if (speechStatus === "speaking") stop();
                          else playNarration(lineIndex);
                        }}
                      >
                        {speechStatus === "speaking" ? (
                          <>
                            <Pause size={16} />
                            暂停朗读
                          </>
                        ) : (
                          <>
                            <Volume2 size={16} />
                            听这一段
                          </>
                        )}
                      </button>
                      {progress.stage === "find" &&
                        progress.found.length < 3 && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setHint((n) => Math.min(n + 1, 2));
                              feedback("看看发亮的轮廓，小东西就藏在那里。", "ui_find_hint");
                            }}
                          >
                            <HelpCircle size={16} />
                            帮帮我
                          </button>
                        )}
                    </div>
                  </div>
                </div>}
              </div>
            </>
          )}
          {storageNotice && (
            <p className="notice" role="status">
              {storageNotice}
            </p>
          )}
          <p className="story-footnote">
            <Leaf size={13} />
            {isDiary
              ? "故事在这里结束，陪伴还会继续。"
              : "慢一点也没关系，森林会等你。"}
          </p>
        </main>
      )}

      {screen === "settings" && (
        <main className="settings-page" data-settings-tab={settingsTab}>
          <button
            className="text-button back-link"
            onClick={() => {
              setScreen(returnScreen.current);
              if (returnScreen.current === "story") setPaused(true);
            }}
          >
            <ArrowLeft size={18} />
            返回{returnScreen.current === "story" ? "故事" : "书架"}
          </button>
          <span className="eyebrow">给陪伴孩子的你</span>
          <h1 ref={headingRef} tabIndex={-1}>
            家长的小角落
          </h1>
          <p className="settings-intro">
            你不必知道所有答案。
            <br />
            愿意坐在身边，就是很好的开始。
          </p>
          {compact && <div className="settings-tabs" role="tablist" aria-label="家长设置分类">
            {[["comfort", "声音"], ["tips", "共玩"], ["record", "记录"], ["about", "关于"]].map(([id, label]) =>
              <button key={id} id={`tab-${id}`} role="tab" aria-selected={settingsTab === id}
                aria-controls={`panel-${id}`} onClick={() => { stop(); setSettingsTab(id); }}>{label}</button>)}
          </div>}
          <section className="settings-section section-tips" id="panel-tips" role={compact ? "tabpanel" : undefined} aria-labelledby={compact ? "tab-tips" : undefined}>
            <h2>
              <Heart size={20} />
              一起玩的三个小建议
            </h2>
            <ol>
              <li>把决定留给孩子，操作慢一点也没关系。</li>
              <li>问题没有标准答案，你也可以先分享自己的感受。</li>
              <li>想停就停。故事会记住你们走到哪里。</li>
            </ol>
          </section>
          <section className="settings-section section-comfort" id="panel-comfort" role={compact ? "tabpanel" : undefined} aria-labelledby={compact ? "tab-comfort" : undefined}>
            <h2>
              <Volume2 size={20} />
              让故事更舒服
            </h2>
            <label className="setting-row">
              <span>
                <b>自动朗读故事</b>
                <small>关闭后，可以由你来读给孩子听</small>
              </span>
              <input
                type="checkbox"
                checked={settings.narration}
                onChange={(e) => changeSetting("narration", e.target.checked)}
              />
            </label>
            <label className="setting-row volume-setting">
              <span>
                <b>朗读音量</b>
                <small>{Math.round(settings.volume * 100)}%</small>
              </span>
              <input
                aria-label="朗读音量"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) =>
                  changeSetting("volume", Number(e.target.value))
                }
              />
            </label>
            <label className="setting-row">
              <span>
                <b>减少动态效果</b>
                <small>让画面更安静，也会尊重设备的动态设置</small>
              </span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) =>
                  changeSetting("reducedMotion", e.target.checked)
                }
              />
            </label>
            <button
              className="text-button"
              onClick={() =>
                play("ui_voice_preview")
              }
            >
              <Play size={16} />
              试听声音
            </button>
            {speechError && (
              <p className="audio-notice" role="status">
                {speechError}
              </p>
            )}
            <p className="fine-print">
              故事使用固定角色录音。声音不能播放时，可以点朗读按钮重试，或选择“家长读”继续体验。
            </p>
          </section>
          <section className="settings-section section-record" id="panel-record" role={compact ? "tabpanel" : undefined} aria-labelledby={compact ? "tab-record" : undefined}>
            <h2>
              <ShieldCheck size={20} />
              这份小小的记录
            </h2>
            <p>
              故事进度和野餐布局只保存在当前浏览器。没有账号，不记录孩子的姓名、声音或回答，也没有行为追踪。更换浏览器、清理网站数据或使用无痕模式，可能无法找回记录。
            </p>
            <button className="danger-text" onClick={() => setConfirm("clear")}>
              清除本机故事记录
            </button>
            {storageNotice && (
              <p className="notice" role="status">
                {storageNotice}
              </p>
            )}
          </section>
          <section className="settings-section credits section-about" id="panel-about" role={compact ? "tabpanel" : undefined} aria-labelledby={compact ? "tab-about" : undefined}>
            <h2>
              <BookOpen size={20} />
              关于这本故事
            </h2>
            <p>
              《风吹走的野餐》是基于早期原著角色创作的中文新故事。淡彩森林插画为
              AI 辅助制作的试用素材，交互道具为项目绘制。不是迪士尼官方产品。
            </p>
            <p>
              字体：Noto Sans SC、Noto Serif SC（SIL
              OFL）。图标：Lucide（ISC）。本版本用于产品体验和亲子试用，正式发行前继续完成内容与素材审核。
            </p>
            <span className="version-note">一起的小冒险 · Web 体验版 0.4</span>
          </section>
        </main>
      )}

      {paused && screen === "story" && (
        <Dialog title="故事歇一会儿" onClose={() => setPaused(false)}>
          <div className="pause-art">
            <Sprout size={42} />
          </div>
          <p className="dialog-copy">
            歇一会儿，聊聊天。
            <br />
            我们会记住你们走到的地方。
          </p>
          <button className="primary-button" onClick={() => setPaused(false)}>
            <Play size={17} />
            继续故事
          </button>
          {compact && !isDiary && <div className="pause-story-tools">
            <button className="text-button" onClick={() => {
              narrationStart.current = lines.length - 1;
              stop(); setNarrationProgress(lines.length - 1, 1); setPaused(false);
            }}>看完整画面</button>
            <button className="text-button" onClick={() => {
              narrationStart.current = 0;
              stop(); setNarrationProgress(0, 0); setPaused(false);
            }}>重看这一幕</button>
          </div>}
          <button className="text-button center-button" onClick={openSettings}>
            <Settings2 size={16} />
            声音与家长设置
          </button>
        </Dialog>
      )}
      {readingPage !== null && <Dialog title="读完整页" onClose={() => setReadingPage(null)}>
        <div className="reading-dialog-page">
          <span className="eyebrow">{scene.title}</span>
          <span className="speaker">{transcript[readingPage].speaker}</span>
          <p>{transcript[readingPage].text}</p>
        </div>
        <nav className="reading-pagination" aria-label="完整页阅读翻页">
          <button className="text-button" disabled={readingPage === 0} onClick={() => setReadingPage(readingPage - 1)}>上一段</button>
          <span>{readingPage + 1} / {transcript.length}</span>
          <button className="text-button" disabled={readingPage === transcript.length - 1} onClick={() => setReadingPage(readingPage + 1)}>下一段</button>
        </nav>
      </Dialog>}
      {diaryDetail !== null && <Dialog title="这次的冒险" onClose={() => setDiaryDetail(null)}>
        <div className="reading-dialog-page">
          <h3>{diaryDetail === 0 ? "今天，我们一起做到了" : "接下来，去生活里玩吧"}</h3>
          <p>{diaryDetail === 0 ? STORY.diary.lines[0].text : "在家里找一个舒服的角落，用手边安全的小物件摆场野餐。也可以改天再玩。"}</p>
        </div>
        <nav className="reading-pagination" aria-label="日记翻页">
          <button className="text-button" disabled={diaryDetail === 0} onClick={() => setDiaryDetail(0)}>上一段</button>
          <span>{diaryDetail + 1} / 2</span>
          <button className="text-button" disabled={diaryDetail === 1} onClick={() => setDiaryDetail(1)}>下一段</button>
        </nav>
      </Dialog>}
      {confirm && (
        <Dialog title={title} onClose={() => setConfirm(null)}>
          <p className="dialog-copy">
            {confirm === "clear"
              ? "这会清除当前浏览器里的故事进度和野餐日记。声音与动态偏好会保留。"
              : confirm === "invalid"
                ? "原记录无法读取。确认后会用新的冒险替换它，取消则继续保留原记录。"
                : "现在的进度和野餐布局会被新的一次冒险替换。"}
          </p>
          <button
            className="primary-button"
            onClick={() => {
              if (confirm === "clear") {
                if (clearProgress(browserStorage)) {
                  setHasSave(false);
                  setCanSave(true);
                  setProgress(newProgress());
                  setStorageNotice("本机故事记录已清除。");
                  setConfirm(null);
                  returnScreen.current = "home";
                } else {
                  setStorageNotice(
                    "浏览器未能清除记录，请在浏览器的网站数据设置中重试。",
                  );
                  setConfirm(null);
                }
              } else restart();
            }}
          >
            {confirm === "clear" ? "确认清除记录" : "确认重新开始"}
            <ChevronRight size={18} />
          </button>
          <button className="secondary-button" onClick={() => setConfirm(null)}>
            保留记录，返回
          </button>
        </Dialog>
      )}
      <div className="sr-only" aria-live="polite">
        {screen === "story" ? scene.title : ""}
      </div>
    </div>
  );
}
