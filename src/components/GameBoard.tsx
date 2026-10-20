import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  FRIENDS,
  FRIEND_NAMES,
  ITEMS,
  ITEM_NAMES,
  type Friend,
  type Item,
} from "../content/story";
import type { Action, Progress } from "../lib/progress";
import type { AudioSequence } from "../content/audio";
import { FriendPortrait, Prop } from "./Illustrations";
import { SceneArt } from "./SceneArt";
import { Cast, PicnicCast, Wind } from "./StoryScene";
import { storyboard } from "../content/storyboard";
import { artworkUrl } from "../lib/artwork";

type BoardProps = {
  progress: Progress;
  dispatch: (action: Action) => void;
  feedback: (message: string, audio: AudioSequence) => void;
};
export function FindBoard({
  progress,
  dispatch,
  feedback,
  hint,
  still = false,
}: BoardProps & { hint: number; still?: boolean }) {
  const [flying, setFlying] = useState<Item | null>(null);
  return (
    <SceneArt
      art="search"
      alt="阳光照进林间小路，草丛和树根旁藏着野餐用品"
      className="find-board"
    >
      <div className="board-world" style={{ backgroundImage: `url(${artworkUrl("search")})` }}>
      <Cast actors={storyboard("find", null)[0].actors} still={still} />
      {ITEMS.map((item, i) => {
        const found = progress.found.includes(item);
        return (
          <button
            key={item}
            className={`find-object object-${i} ${found ? "found" : ""} ${hint ? "hinted" : ""}`}
            disabled={found}
            aria-label={`找到${ITEM_NAMES[item]}`}
            onClick={() => {
              dispatch({ type: "COLLECT", item });
              setFlying(item);
              feedback(
                item === "cup"
                  ? "原来杯子躲在这里。"
                  : item === "napkin"
                    ? "找到一块很会旅行的餐巾。"
                    : "找到篮子了，东西有地方放了。",
                `ui_find_${item}`,
              );
            }}
          >
            {found ? (
              <Check size={26} />
            ) : (
              <>
                <Prop item={item} />
                {hint > 1 && (
                  <span className="object-label">{ITEM_NAMES[item]}</span>
                )}
              </>
            )}
          </button>
        );
      })}
      {flying && <div className="collect-flight" key={flying} onAnimationEnd={() => setFlying(null)} aria-hidden="true">
        <Prop item={flying} className={`flying-object flight-${ITEMS.indexOf(flying)}`} />
      </div>}
      <svg className="search-foreground" viewBox="0 0 1536 1024" aria-hidden="true">
        <defs><clipPath id="search-grass-mask">
          <path d="M230 420 340 395 440 420 475 470 450 490 421 462 395 443 360 435 320 438 290 458 270 485 245 510 215 500Z" />
          <path d="M260 528 300 530 330 522 350 535 370 530 400 528 430 540 480 530 480 580 250 580Z" />
          <path d="M1060 880 1065 720 1080 770 1090 700 1105 770 1125 715 1130 785 1160 760 1170 710 1180 780 1210 680 1200 790 1250 725 1220 810 1270 800 1300 880Z" />
          <path d="M1200 300 1450 300 1450 360 1400 360 1350 340 1320 355 1290 345 1230 360 1200 350Z" />
        </clipPath></defs>
        <image href={artworkUrl("search")} width="1536" height="1024" clipPath="url(#search-grass-mask)" />
      </svg>
      <span className="scene-caption">
        <Sparkles size={14} /> 小发现，藏在不远的地方
      </span>
      </div>
    </SceneArt>
  );
}

export function PicnicBoard({
  progress,
  dispatch,
  feedback,
  stones = false,
  readOnly = false,
  shot = 1,
  speaker,
  speaking = false,
  still = false,
}: BoardProps & { stones?: boolean; readOnly?: boolean; shot?: number; speaker?: string; speaking?: boolean; still?: boolean }) {
  const [selected, setSelected] = useState<Friend | null>(null);
  const nextFriend = FRIENDS.find((friend) => !progress.seats.includes(friend));
  const allSeated = !nextFriend;
  const activeFriend = selected ?? nextFriend;
  return (
    <div className="picnic-container">
      <SceneArt
        art="picnic"
        alt="背风的大树下，铺着一张奶油色格纹野餐垫"
        className={`picnic-board ${readOnly ? "readonly-board" : ""} ${readOnly && shot > 0 ? "ending-close" : ""}`}
      >
        <div className="board-world" style={{ backgroundImage: `url(${artworkUrl("picnic")})` }}>
        {stones
          ? <Cast actors={shot === 0 || progress.stones.length === 3 ? storyboard("stones", null)[0].actors : []} still={still} />
          : <PicnicCast seats={progress.seats} speaker={speaker} speaking={speaking} still={still} arrive={!readOnly} />}
        {readOnly && <Wind />}
        <div className={`blanket ${stones ? "stone-blanket" : ""}`}>
          <div className="blanket-seam" />
          <Prop item="basket" className="corner-basket" />
          {!stones && progress.stones.map((slot) => <div key={slot} className={`fixed-stone corner-${slot}`}><Prop item="stone" /></div>)}
          {stones ? (
            <>
              {[0, 1, 2].map((slot) => {
                const placed = progress.stones.includes(slot);
                return (
                  <button
                    key={slot}
                    className={`stone-slot corner-${slot} ${placed ? "placed" : ""}`}
                    aria-label={`给第${slot + 1}个垫角放石头`}
                    disabled={placed}
                    onClick={() => {
                      dispatch({ type: "STONE", slot });
                      feedback("这一个垫角稳稳的了。", progress.stones.length === 2
                        ? ["ui_stone_placed", "optional_stones_complete"] : "ui_stone_placed");
                    }}
                  >
                    {placed ? (
                      <Prop item="stone" />
                    ) : (
                      <><span className="flutter-corner" /><span className="corner-mark">＋</span></>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <div className="seat-row">
                {progress.seats.map((friend, slot) => {
                  const label = friend
                    ? `${FRIEND_NAMES[friend]}的座位`
                    : `第${slot + 1}个空座位`;
                  const contents = friend ? (
                    <>
                      <span className="drawn-plate" aria-hidden="true" />
                      <span className="place-name">{FRIEND_NAMES[friend]}</span>
                    </>
                  ) : (
                    <>
                      <span className="seat-plus">＋</span>
                      <span>放这里</span>
                    </>
                  );
                  if (readOnly)
                    return (
                      <div className="plate filled" key={slot}>
                        {contents}
                      </div>
                    );
                  return (
                    <button
                      key={slot}
                      aria-label={label}
                      aria-pressed={Boolean(friend && selected === friend)}
                      className={`plate ${friend ? "filled" : ""} ${selected === friend && friend ? "selected" : ""}`}
                      disabled={!allSeated && Boolean(friend)}
                      onClick={() => {
                        if (allSeated && !selected && friend) {
                          setSelected(friend);
                          feedback(
                            `给${FRIEND_NAMES[friend]}换个位置，点另一个座位就好。`,
                            `ui_seat_select_${friend}`,
                          );
                          return;
                        }
                        if (activeFriend) {
                          dispatch({
                            type: "SEAT",
                            friend: activeFriend,
                            slot,
                          });
                          feedback(
                            `${FRIEND_NAMES[activeFriend]}的位置摆好了。`,
                            `ui_seat_placed_${activeFriend}`,
                          );
                          setSelected(null);
                        }
                      }}
                    >
                      {contents}
                    </button>
                  );
                })}
              </div>
              <div className="decoration-row">
                {(["flower", "leaf"] as const).map((item) => (
                  <div key={item} className="decoration-space">
                    {progress.decorations.includes(item) && (
                      <Prop item={item} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </SceneArt>
      {!stones && !readOnly && (
        <div className="picnic-tools">
          <div className="current-friend">
            {activeFriend ? (
              <>
                <FriendPortrait friend={activeFriend} />
                <div>
                  <small>{selected ? "换一个位置" : "现在轮到"}</small>
                  <strong>{FRIEND_NAMES[activeFriend]}的餐具</strong>
                </div>
              </>
            ) : (
              <div>
                <strong>每位朋友都有位置了</strong>
                <small>点餐具，再点另一个座位，可以交换</small>
              </div>
            )}
          </div>
          <div className="decoration-tools">
            <span>再添一点喜欢的</span>
            <div>
              {(["flower", "leaf"] as const).map((item) => (
                <button
                  key={item}
                  className={
                    progress.decorations.includes(item) ? "active" : ""
                  }
                  aria-pressed={progress.decorations.includes(item)}
                  onClick={() => {
                    dispatch({ type: "DECORATE", item });
                    feedback(
                      progress.decorations.includes(item)
                        ? "先收起这个装饰。"
                        : "小小的装饰，让野餐更特别了。",
                      progress.decorations.includes(item)
                        ? "ui_decoration_removed" : "ui_decoration_added",
                    );
                  }}
                >
                  <Prop item={item} />
                  {item === "flower" ? "一朵纸花" : "一片叶子"}
                  {progress.decorations.includes(item) && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
