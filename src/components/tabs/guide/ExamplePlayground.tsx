import { useState } from "react";
import type { TabKind } from "../../../lib/tabTypes";
import { exampleNotation, parseNotation } from "../../../lib/tablature";
import { TabScoreView } from "../TabScoreView";
import { examples } from "./guideContent";

export function ExamplePlayground({
  kind,
  onInsertExample,
}: {
  kind: TabKind;
  onInsertExample?: (text: string) => void;
}) {
  const [example, setExample] = useState(
    kind === "piano" ? 6 : kind === "drums" ? 5 : 0,
  );
  const current = examples[example];
  return (
    <>
      <h3>5. Посмотрите на примере</h3>
      <label className="field">
        Пример
        <select
          aria-label="Пример табулатуры"
          value={example}
          onChange={(event) => setExample(Number(event.target.value))}
        >
          {examples.map((item, index) => (
            <option key={item.title} value={index}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <pre className="tab-guide-example">{current.text}</pre>
      <p>{current.explanation}</p>
      <TabScoreView
        key={example}
        score={parseNotation(current.text, current.kind, {
          beats: 4,
          unit: 4,
        })}
      />
      {onInsertExample && (
        <button
          className="btn btn-small"
          type="button"
          onClick={() => onInsertExample(exampleNotation(kind))}
        >
          Вставить учебный пример для моей партии (4/4)
        </button>
      )}
    </>
  );
}
