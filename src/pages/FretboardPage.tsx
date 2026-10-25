import { usePracticeSetting } from "../lib/guitar/settings";
import { BackLink } from "../components/ui/BackLink";
import { ScaleTab } from "../components/fretboard/ScaleTab";
import { ChordIdentifierTab } from "../components/fretboard/ChordIdentifierTab";
import { KeyIdentifierTab } from "../components/fretboard/KeyIdentifierTab";
import "../styles/fretboard.css";

import { GuitarLab } from "../components/guitar/GuitarLab";
type TabId = "scales" | "chords" | "keys" | "practice";

const TABS: { id: TabId; label: string }[] = [
  { id: "practice", label: "Гитарная практика" },
  { id: "scales", label: "Гаммы" },
  { id: "chords", label: "Определитель аккордов" },
  { id: "keys", label: "Определитель тональности" },
];

export function FretboardPage({
  navigate,
  onSaveLick,
}: {
  navigate: (route: string) => void;
  onSaveLick?: (title: string, content: string) => void;
}) {
  const [tab, setTab] = usePracticeSetting("pageTab");

  return (
    <section className="fretboard-page" aria-label="Гриф гитары">
      <BackLink onClick={() => navigate("chords")}>
        Библиотека аккордов
      </BackLink>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">ГРИФ ГИТАРЫ — 24 ЛАДА</p>
          <h1>Исследование грифа</h1>
          <p className="chord-page-description">
            Гаммы, определение аккордов и тональностей на грифе гитары.
          </p>
        </div>
      </div>
      <div className="fretboard-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`fretboard-tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "practice"}>
        <GuitarLab active={tab === "practice"} onSaveLick={onSaveLick} />
      </div>
      <div hidden={tab !== "scales"}>
        <ScaleTab />
      </div>
      <div hidden={tab !== "chords"}>
        <ChordIdentifierTab />
      </div>
      <div hidden={tab !== "keys"}>
        <KeyIdentifierTab />
      </div>
    </section>
  );
}
