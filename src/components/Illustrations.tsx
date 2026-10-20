import { useId, useState } from "react";
import type { Friend, Item } from "../content/story";
import { artworkUrl } from "../lib/artwork";

export function FriendPortrait({
  friend,
  className = "",
}: {
  friend: Friend;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!failed)
    return (
      <svg className={className} viewBox={`0 0 100 ${friend === "donkey" ? 63.27 : friend === "bear" ? 250.65 : 169.55}`} aria-hidden="true">
        <image
          href={artworkUrl(friend)}
          width="100"
          height={friend === "donkey" ? 63.27 : friend === "bear" ? 250.65 : 169.55}
          preserveAspectRatio="xMidYMax meet"
          onError={() => setFailed(true)}
        />
      </svg>
    );
  const isPig = friend === "pig";
  const isDonkey = friend === "donkey";
  const fill = isPig ? "#dca69b" : isDonkey ? "#aaa69a" : "#bd935d";
  return (
    <svg
      className={className}
      viewBox="0 0 100 110"
      fill="none"
      aria-hidden="true"
    >
      {isDonkey ? (
        <>
          <path
            d="M29 46C8 11 20-3 32 12L43 45M56 43C62 7 75 0 79 16L70 49"
            fill={fill}
            stroke="#6f7064"
            strokeWidth="2"
          />
          <path
            d="m28 19 8 23m34-24-8 24"
            stroke="#d3b7aa"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="25"
            cy="34"
            r={isPig ? 14 : 15}
            fill={fill}
            stroke="#806748"
            strokeWidth="1.5"
          />
          <circle
            cx="75"
            cy="34"
            r={isPig ? 14 : 15}
            fill={fill}
            stroke="#806748"
            strokeWidth="1.5"
          />
          <circle cx="25" cy="34" r="8" fill={isPig ? "#e8b8ae" : "#dbc1a0"} />
          <circle cx="75" cy="34" r="8" fill={isPig ? "#e8b8ae" : "#dbc1a0"} />
        </>
      )}
      <ellipse cx="50" cy="95" rx="31" ry="28" fill={fill} />
      <ellipse
        cx="50"
        cy="57"
        rx="34"
        ry="32"
        fill={fill}
        stroke={isDonkey ? "#6f7064" : "#806748"}
        strokeWidth="1.5"
      />
      <ellipse
        cx="50"
        cy="71"
        rx={isPig ? 20 : 24}
        ry="16"
        fill={isPig ? "#ebb7a9" : "#dfc9a6"}
      />
      {isPig ? (
        <>
          <circle cx="44" cy="70" r="2.5" fill="#956658" />
          <circle cx="56" cy="70" r="2.5" fill="#956658" />
        </>
      ) : (
        <path d="M43 66Q50 62 57 66Q55 73 50 73Q45 73 43 66Z" fill="#594b39" />
      )}
      <circle cx="35" cy="53" r="3" fill="#3c3428" />
      <circle cx="64" cy="53" r="3" fill="#3c3428" />
      <path
        d="M45 79q5 4 10 0"
        stroke="#79634e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {friend === "bear" && (
        <path d="M23 86Q49 100 78 86l-5 14-19-3-14 12-4-16Z" fill="#6d8260" />
      )}
      {isPig && <path d="M28 96h43l6 14H22Z" fill="#eee0c7" />}
      {isDonkey && (
        <path
          d="m38 31 7-11 3 10 7-13 2 12 8-6-3 12"
          stroke="#6f7064"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      <path
        d="M50 31v12m0 43v5"
        stroke="#fff6e5"
        strokeWidth="1.4"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

export function Prop({
  item,
  className = "",
}: {
  item: Item | "stone" | "flower" | "leaf";
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="13" height="13" patternUnits="userSpaceOnUse">
          <path d="M0 0h13v13H0Z" fill="#f4dfb9" />
          <path
            d="M0 6h13M6 0v13"
            stroke="#be8960"
            strokeOpacity=".45"
            strokeWidth="5"
          />
        </pattern>
      </defs>
      {item === "cup" && (
        <>
          <path
            d="M68 35h10q17 0 12 18T69 69"
            stroke="#73573b"
            strokeWidth="5"
          />
          <path
            d="M20 30h50v40q0 12-25 12T20 70Z"
            fill="#e8c275"
            stroke="#73573b"
            strokeWidth="2.5"
          />
          <ellipse
            cx="45"
            cy="30"
            rx="25"
            ry="8"
            fill="#fbf1d7"
            stroke="#73573b"
            strokeWidth="2.5"
          />
          <path
            d="M29 45v22"
            stroke="#fff7e5"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="m43 55 4 6 9-9" stroke="#9e753e" strokeWidth="2" />
        </>
      )}
      {item === "basket" && (
        <>
          <path
            d="M28 46V34q0-31 23-29t23 29v12"
            stroke="#89633e"
            strokeWidth="8"
          />
          <path
            d="m15 39 8 45q29 14 56 0l8-45Z"
            fill={`url(#${id})`}
            stroke="#89633e"
            strokeWidth="3"
          />
          <path
            d="M14 39q36 15 74 0M20 51q32 11 63 0"
            stroke="#89633e"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="m52 44 7 24 15-10-2-16"
            fill="#e9e0c4"
            stroke="#b2a47b"
            strokeWidth="2"
          />
        </>
      )}
      {item === "napkin" && (
        <>
          <path
            d="m18 27 58-9 8 61-57 9Z"
            fill="#efdfb8"
            stroke="#9f8565"
            strokeWidth="2"
          />
          <path d="m23 31 49-8 7 51-47 8Z" fill={`url(#${id})`} />
          <path
            d="m18 27 34 30 24-39"
            fill="#f8ebce"
            stroke="#b5a17d"
            strokeWidth="2"
          />
          <path d="m52 57-25 31" stroke="#c5ad83" strokeWidth="2" />
        </>
      )}
      {item === "stone" && (
        <>
          <path
            d="M10 68 23 43l25-12 28 10 14 25-15 17-49 1Z"
            fill="#aaa896"
            stroke="#777a6b"
            strokeWidth="2"
          />
          <path d="m24 45 25-8 22 9-30 3-15 18-9-1Z" fill="#d2ceba" />
          <path d="m48 68 24-10 10 7" stroke="#939582" strokeWidth="2" />
        </>
      )}
      {item === "flower" && (
        <>
          <path d="m48 82 4-41" stroke="#6e8752" strokeWidth="4" />
          <path d="M50 70Q24 66 30 52q19 1 20 18Z" fill="#9ba868" />
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <ellipse
              key={r}
              cx="50"
              cy="22"
              rx="10"
              ry="17"
              transform={`rotate(${r} 50 40)`}
              fill="#fff3cf"
              stroke="#cbb888"
              strokeWidth="1.5"
            />
          ))}
          <circle cx="50" cy="40" r="12" fill="#d6a553" />
        </>
      )}
      {item === "leaf" && (
        <>
          <path
            d="M19 76C14 41 43 18 83 15c1 42-22 68-64 61Z"
            fill="#8f9e62"
            stroke="#60784b"
            strokeWidth="2"
          />
          <path
            d="m18 83 50-52M39 59l-7-19m19 8 20-1"
            stroke="#d9d8a2"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 180"
      fill="none"
      aria-hidden="true"
    >
      <path d="M35 172Q75 90 51 8" stroke="currentColor" strokeWidth="2" />
      {[
        [55, 24, -25],
        [60, 55, 30],
        [60, 85, -35],
        [51, 116, 25],
        [41, 145, -40],
      ].map(([x, y, r], i) => (
        <path
          key={i}
          d={`M${x} ${y}q-35-31-27-43q34 9 27 43Z`}
          transform={`rotate(${r} ${x} ${y})`}
          fill="currentColor"
          fillOpacity=".23"
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
