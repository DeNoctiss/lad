import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { TabKind } from "../../lib/tabTypes";
import "../../styles/tabGuide.css";
import { GuideBasics } from "./guide/GuideBasics";
import { CommandTable } from "./guide/CommandTable";
import { EffectsSection } from "./guide/EffectsSection";
import { ExamplePlayground } from "./guide/ExamplePlayground";
import { Troubleshooting } from "./guide/Troubleshooting";

export function TabGuide({
  kind = "guitar",
  onInsertExample,
}: {
  kind?: TabKind;
  onInsertExample?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="tab-guide"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <BookOpen size={17} />
        <span>Как писать и читать табулатуру</span>
        <ChevronDown size={16} />
      </summary>
      {open && (
        <div className="tab-guide-body">
          <GuideBasics />
          <CommandTable />
          <EffectsSection />
          <ExamplePlayground kind={kind} onInsertExample={onInsertExample} />
          <Troubleshooting />
        </div>
      )}
    </details>
  );
}
