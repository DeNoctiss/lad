import { Plus } from "lucide-react";
import { emptyTab } from "../../lib/model";

export function TextTabBlock({
  instrument,
  content,
  onChange,
}: {
  instrument: string;
  content: string;
  onChange: (content: string) => void;
}) {
  return (
    <>
      <div className="tab-editor-tools">
        <span className="field-help">
          e — тонкая струна, E — толстая; h — хаммер, p — пулл-офф, / — слайд.
          <br />В этом режиме символы сохраняются как текст, без расчёта ритма.
        </span>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => onChange(`${content}\n\n${emptyTab(instrument)}`)}
        >
          <Plus size={14} />
          Добавить такт
        </button>
      </div>
      <label className="field">
        Табулатура
        <textarea
          aria-label="Табулатура"
          className="tab-editor"
          rows={13}
          spellCheck={false}
          wrap="off"
          value={content}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </>
  );
}
