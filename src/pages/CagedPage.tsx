import { BackLink } from "../components/ui/BackLink";
import type { Chord } from "../lib/model";
import { CAGED_MAJOR_SHAPES, CAGED_MINOR_SHAPES } from "../lib/chordDatabase";
import type { CagedShape } from "../lib/chordDatabase";
import { ChordDiagram } from "../components/chords/ChordDiagram";

function CagedShapeCard({
  shape,
  quality,
}: {
  shape: CagedShape;
  quality: "Мажор" | "Минор";
}) {
  const chord: Chord = {
    id: `caged-${shape.shapeName}-${quality}`,
    name: quality === "Мажор" ? shape.rootName : shape.rootName + "m",
    frets: shape.frets,
    baseFret: 1,
  };
  return (
    <div className="caged-card">
      <div className="caged-card-header">
        <span className="caged-shape-name">{shape.shapeName}</span>
        <span className="caged-root">
          {quality === "Мажор" ? shape.rootName : shape.rootName + "m"}
        </span>
      </div>
      <ChordDiagram chord={chord} />
      <p className="caged-description">{shape.description}</p>
    </div>
  );
}

export function CagedSystem({
  navigate,
}: {
  navigate: (route: string) => void;
}) {
  return (
    <section className="chord-library" aria-label="Система CAGED">
      <BackLink onClick={() => navigate("chords")}>
        Библиотека аккордов
      </BackLink>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">ПОДВИЖНЫЕ ФОРМЫ ПО ГРИФУ</p>
          <h1>Система CAGED</h1>
          <p className="chord-page-description">
            Пять открытых форм аккордов — C, A, G, E, D — которые можно
            перемещать вдоль грифа, получая новые аккорды.
          </p>
        </div>
      </div>
      <div className="caged-intro">
        <p>
          Название системы складывается из пяти базовых мажорных аккордов:{" "}
          <strong>C</strong>, <strong>A</strong>, <strong>G</strong>,{" "}
          <strong>E</strong>, <strong>D</strong>. Каждый из них — это отдельная
          «форма» на грифе. Если взять любую форму и сдвинуть её на <em>N</em>{" "}
          ладов вверх, получится новый аккорд, корень которого на <em>N</em>{" "}
          полутонов выше.
        </p>
        <p>
          Например, <strong>E-форма</strong> на 1-м ладу даёт F, на 3-м — G, на
          5-м — A. <strong>A-форма</strong> на 3-м ладу даёт C — это
          классическое баррэ <code>x35553</code>.
        </p>
        <p>
          Открытые струны при перемещении превращаются в баррэ: указательный
          палец зажимает все струны на нужном ладу, а остальные пальцы берут
          форму поверх баррэ.
        </p>
      </div>
      <h2 className="subheading caged-section-title">Мажорные формы</h2>
      <div className="caged-grid">
        {CAGED_MAJOR_SHAPES.map((shape) => (
          <CagedShapeCard key={shape.shapeName} shape={shape} quality="Мажор" />
        ))}
      </div>
      <h2 className="subheading caged-section-title">Минорные формы</h2>
      <div className="caged-grid">
        {CAGED_MINOR_SHAPES.map((shape) => (
          <CagedShapeCard key={shape.shapeName} shape={shape} quality="Минор" />
        ))}
      </div>
      <p className="chord-library-note">
        Формы C, A, G, E, D расположены по порядку вдоль грифа. E- и A-формы —
        самые удобные для баррэ. C- и G-формы реже используются как полные
        баррэ, но важны для понимания грифа и соло-аккомпанемента.
      </p>
    </section>
  );
}
