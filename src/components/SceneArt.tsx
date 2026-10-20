import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { Art } from "../content/story";
import { artworkUrl } from "../lib/artwork";

export function SceneArt({
  art,
  children,
  className = "",
  alt,
  priority = false,
}: {
  art: Art;
  children?: ReactNode;
  className?: string;
  alt: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <div className={`scene-art ${className} ${failed ? "art-failed" : ""}`}>
      {!failed && (
        <img
          key={`${art}-${attempt}`}
          src={artworkUrl(art, attempt)}
          alt={alt}
          draggable={false}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <div className="art-retry">
          <span>森林的画面还在路上</span>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            <RotateCcw size={15} />
            重新加载画面
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
