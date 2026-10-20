import { Check, Ear, Heart } from "lucide-react";
import { CHOICE_TEXT, type CompanionChoice } from "../content/story";

export function CompanionChoices({ selected, onSelect }: {
  selected: CompanionChoice | null; onSelect: (choice: CompanionChoice) => void;
}) {
  return <div className="choice-list" role="group" aria-label="选择陪伴方式">
    {(["listen", "stay"] as const).map(choice => <button key={choice}
      className={selected === choice ? "selected" : ""}
      aria-pressed={selected === choice} onClick={() => onSelect(choice)}>
      <span className="choice-icon">{choice === "listen" ? <Ear size={25} /> : <Heart size={25} />}</span>
      <span><b>{CHOICE_TEXT[choice].title}</b><small>{CHOICE_TEXT[choice].description}</small></span>
      <span className="choice-check">{selected === choice && <Check size={15} />}</span>
    </button>)}
  </div>;
}
