import { useEffect, useState } from "react";
/** Empty intermediate input must not overwrite the project with zero. */
export function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onCommit: (value: number) => boolean | void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (
      !draft.trim() ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      onCommit(n) === false
    )
      setDraft(String(value));
    else setDraft(String(n));
  };
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step="any"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(String(value));
        }
      }}
    />
  );
}
