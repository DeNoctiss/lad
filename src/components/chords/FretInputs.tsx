import { strings } from "./chordUtils";

export function FretInputs({
  prefix,
  frets,
  invalid,
  errorsId,
  onChange,
}: {
  prefix: string;
  frets: string[];
  invalid: boolean;
  errorsId: string;
  onChange: (frets: string[]) => void;
}) {
  return (
    <>
      <fieldset
        className="chord-fret-fieldset"
        aria-describedby={`${prefix}-fret-help${invalid ? ` ${errorsId}` : ""}`}
      >
        <legend>Лады на струнах</legend>
        <div className="chord-fret-inputs">
          {strings.map((string, index) => (
            <label
              className="field"
              key={string}
              htmlFor={`${prefix}-string-${index}`}
            >
              <span>
                {string}
                <small>{6 - index}</small>
              </span>
              <input
                id={`${prefix}-string-${index}`}
                type="number"
                min={-1}
                max={24}
                step={1}
                required
                aria-label={`${6 - index}-я струна ${string}, лад`}
                aria-invalid={invalid}
                value={frets[index]}
                onChange={(event) =>
                  onChange(
                    frets.map((value, fretIndex) =>
                      fretIndex === index ? event.target.value : value,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <p id={`${prefix}-fret-help`} className="chord-field-hint">
        От толстой E к тонкой e. −1 — не звучит, 0 — открытая струна, 1–24 —
        номер лада.
      </p>
    </>
  );
}
