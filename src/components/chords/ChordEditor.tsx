import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { uid } from "../../lib/model";
import type { Chord } from "../../lib/model";
import { FretInputs } from "./FretInputs";
import { ChordPreview } from "./ChordPreview";

type Draft = { name: string; baseFret: string; frets: string[] };

function validateDraft(draft: Draft) {
  const errors: { name?: string; baseFret?: string; frets?: string } = {};
  const base = Number(draft.baseFret);
  if (!draft.name.trim()) errors.name = "Укажите название аккорда.";
  if (
    !draft.baseFret.trim() ||
    !Number.isInteger(base) ||
    base < 1 ||
    base > 20
  )
    errors.baseFret = "Начальный лад — целое число от 1 до 20.";
  if (
    draft.frets.length !== 6 ||
    draft.frets.some(
      (value) =>
        !value.trim() ||
        !Number.isInteger(Number(value)) ||
        Number(value) < -1 ||
        Number(value) > 24,
    )
  ) {
    errors.frets = "Для каждой струны введите целое число от −1 до 24.";
  } else if (
    !errors.baseFret &&
    draft.frets.some(
      (value) =>
        Number(value) > 0 && (Number(value) < base || Number(value) > base + 4),
    )
  ) {
    errors.frets = `Зажатые струны должны находиться в пределах ${base}–${base + 4} ладов. Измените начальный лад или аппликатуру.`;
  }
  return errors;
}

export function ChordEditor({
  chord,
  onSave,
  onDelete,
  onClose,
}: {
  chord: Chord | null;
  onSave: (chord: Chord) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: chord?.name ?? "",
    baseFret: String(chord?.baseFret ?? 1),
    frets: chord?.frets.map(String) ?? ["-1", "0", "2", "2", "1", "0"],
  }));
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState("");
  const errors = validateDraft(draft);
  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError("");
    if (!isValid) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    try {
      onSave({
        id: chord?.id ?? uid(),
        name: draft.name.trim(),
        baseFret: Number(draft.baseFret),
        frets: draft.frets.map(Number),
      });
      onClose();
    } catch {
      setSaveError("Не удалось сохранить аккорд. Попробуйте ещё раз.");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal chord-editor"
      aria-labelledby={`${prefix}-title`}
      aria-describedby={`${prefix}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-header chord-editor-header">
          <div>
            <p className="eyebrow">ВАША АППЛИКАТУРА</p>
            <h2 id={`${prefix}-title`}>
              {chord ? "Редактировать аккорд" : "Новый аккорд"}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Закрыть редактор аккорда"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p id={`${prefix}-description`} className="chord-editor-description">
          Сохраните удобную позицию. У одного аккорда может быть несколько
          аппликатур.
        </p>
        <div className="chord-editor-layout">
          <div className="chord-editor-fields">
            <label className="field" htmlFor={`${prefix}-name`}>
              Название аккорда
              <input
                id={`${prefix}-name`}
                autoFocus
                required
                value={draft.name}
                placeholder="Например, Am или F#m7"
                aria-invalid={submitted && !!errors.name}
                aria-describedby={
                  submitted && errors.name ? `${prefix}-errors` : undefined
                }
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="field" htmlFor={`${prefix}-base`}>
              Начальный лад
              <input
                id={`${prefix}-base`}
                type="number"
                min={1}
                max={20}
                step={1}
                required
                value={draft.baseFret}
                aria-invalid={submitted && !!errors.baseFret}
                aria-describedby={`${prefix}-range${submitted && errors.baseFret ? ` ${prefix}-errors` : ""}`}
                onChange={(event) =>
                  setDraft({ ...draft, baseFret: event.target.value })
                }
              />
            </label>
            <p id={`${prefix}-range`} className="chord-field-hint">
              На схеме всегда пять ладов. Начальная позиция — от 1 до 20.
            </p>
            <FretInputs
              prefix={prefix}
              frets={draft.frets}
              invalid={submitted && !!errors.frets}
              errorsId={`${prefix}-errors`}
              onChange={(frets) => setDraft({ ...draft, frets })}
            />
          </div>
          <ChordPreview
            name={draft.name}
            baseFret={Number(draft.baseFret)}
            frets={draft.frets.map(Number)}
            error={errors.baseFret || errors.frets}
          />
        </div>
        {((submitted && !isValid) || saveError) && (
          <div
            id={`${prefix}-errors`}
            className="chord-errors"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {Object.values(errors).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {saveError && <p>{saveError}</p>}
          </div>
        )}
        <div className="modal-actions chord-editor-actions">
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm(
                    `Удалить эту аппликатуру «${chord?.name}» (${chord?.frets.map((f) => (f < 0 ? "x" : f)).join("")})?`,
                  )
                ) {
                  onDelete();
                  onClose();
                }
              }}
            >
              <Trash2 size={16} />
              Удалить
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            {chord ? "Сохранить изменения" : "Добавить аккорд"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
