import { useState } from "react";
import { BackLink } from "../components/ui/BackLink";
import { ScaleTab } from "../components/fretboard/ScaleTab";
import { ChordIdentifierTab } from "../components/fretboard/ChordIdentifierTab";
import { KeyIdentifierTab } from "../components/fretboard/KeyIdentifierTab";
import "../styles/fretboard.css";

type TabId = "scales" | "chords" | "keys";

const TABS: { id: TabId; label: string }[] = [
  { id: "scales", label: "Гаммы" },
  { id: "chords", label: "Определитель аккордов" },
  { id: "keys", label: "Определитель тональности" },
];

export function FretboardPage({
  navigate,
}: {
  navigate: (route: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("scales");

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
      {tab === "scales" && <ScaleTab />}
      {tab === "chords" && <ChordIdentifierTab />}
      {tab === "keys" && <KeyIdentifierTab />}
    </section>
  );
}
