import type { CSSProperties } from "react";
import { FRIEND_NAMES, type CompanionChoice, type Friend, type Stage, STORY } from "../content/story";
import { storyboard, type Actor } from "../content/storyboard";
import { FriendPortrait, Prop } from "./Illustrations";
import { SceneArt } from "./SceneArt";

function actorStyle(actor: Actor): CSSProperties {
  const positions = { ...actor.journey, end: actor };
  const pathVariables = actor.journey ? Object.fromEntries(
    Object.entries(positions).flatMap(([step, position]) => [
      [`--path-${step}-x`, `${position.x}%`],
      [`--path-${step}-y`, `${position.y}%`],
      [`--path-${step}-width`, `${position.width}%`],
    ]),
  ) : {};
  return { left: `${actor.x}%`, top: `${actor.y}%`, width: `${actor.width}%`, ...pathVariables };
}

export function Cast({ actors, speaker, speaking = false, still = false, carryBasket = false }: {
  actors: Actor[]; speaker?: string; speaking?: boolean; still?: boolean; carryBasket?: boolean;
}) {
  return <div className={`scene-cast ${still ? "cast-still" : ""}`} aria-hidden="true">
    {actors.map((actor) => <div key={actor.friend}
      className={`scene-actor actor-${actor.friend} ${actor.motion ? `actor-${actor.motion}` : ""} ${actor.journey ? "actor-path" : ""}`}
      data-friend={actor.friend} data-facing={actor.facing}
      style={actorStyle(actor)}>
      <div className={`actor-facing face-${actor.facing}`}>
        <div className={`actor-body ${speaker === FRIEND_NAMES[actor.friend] ? "actor-current" : ""} ${speaking && speaker === FRIEND_NAMES[actor.friend] ? "actor-speaking" : ""}`}>
          <FriendPortrait friend={actor.friend} />
        </div>
      </div>
      {carryBasket && actor.friend === "bear" && <div className="actor-carried-basket"><Prop item="basket" /></div>}
      <span className="actor-shadow" />
    </div>)}
  </div>;
}

export function Wind({ quiet = false }: { quiet?: boolean }) {
  return <div className={`wind-layer ${quiet ? "quiet-wind" : ""}`} aria-hidden="true">
    {[0, 1, 2].map((n) => <Prop key={n} item="leaf" className={`wind-leaf wind-leaf-${n}`} />)}
  </div>;
}

export function StoryScene({ stage, choice, shot: index, speaker, speaking, still }: {
  stage: Stage; choice: CompanionChoice | null; shot: number;
  speaker?: string; speaking: boolean; still: boolean;
}) {
  const shots = storyboard(stage, choice);
  const shot = shots[Math.min(index, shots.length - 1)];
  return <SceneArt art={STORY[stage].art} alt={shot.caption}
    className={`narrative-scene storyboard-scene scene-${stage} camera-${shot.camera ?? "wide"}`}
    priority>
    <Cast actors={shot.actors} speaker={speaker} speaking={speaking} still={still} carryBasket={stage === "walk"} />
    {["intro", "wind-talk", "walk"].includes(stage) && <Wind quiet={stage !== "intro"} />}
    {stage === "wind-talk" && <div className="gathered-props" aria-hidden="true">
      <Prop item="basket" /><Prop item="cup" /><Prop item="napkin" />
    </div>}
    <span className="scene-caption">{shot.caption}</span>
  </SceneArt>;
}

export function PicnicCast({ seats, speaker, speaking = false, still = false, arrive = false }: {
  seats: (Friend | null)[]; speaker?: string; speaking?: boolean; still?: boolean; arrive?: boolean;
}) {
  const actors: Actor[] = seats.flatMap((friend, i) => friend ? [{
    friend, x: [23, 50, 77][i], y: [38, 30, 38][i],
    width: friend === "donkey" ? 28 : friend === "bear" ? 9 : 8,
    facing: i === 2 ? "left" : "right",
    motion: arrive ? "arrive" : undefined,
  }] : []);
  return <Cast actors={actors} speaker={speaker} speaking={speaking} still={still} />;
}
