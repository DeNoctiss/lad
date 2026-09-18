import type { TabEvent } from "../../../lib/tabTypes";
import { rhythmLabel } from "./scoreShared";

export function Rhythm({ event, x }: { event: TabEvent; x: number }) {
  const flags = event.duration === 16 ? 2 : event.duration === 8 ? 1 : 0;
  return (
    <g className="tab-score-rhythm" aria-hidden="true">
      {event.notes.length === 0 ? (
        <g className="tab-score-rest-symbol">
          {event.duration <= 2 ? (
            <>
              <path d={`M ${x - 12} 42 H ${x + 12}`} />
              <rect
                x={x - 7}
                y={event.duration === 1 ? 42 : 36}
                width={14}
                height={6}
                className="tab-score-head"
              />
            </>
          ) : event.duration === 4 ? (
            <path d={`M ${x + 3} 27 l -7 11 8 10 q -12 -3 -7 12`} />
          ) : (
            <>
              <path d={`M ${x + 7} 29 L ${x - 2} 61`} />
              {Array.from(
                { length: event.duration === 16 ? 2 : 1 },
                (_, flag) => (
                  <g key={flag}>
                    <path
                      d={`M ${x + 6 - flag * 2} ${33 + flag * 10} Q ${x - 1} ${43 + flag * 10} ${x - 7} ${35 + flag * 10}`}
                    />
                    <circle
                      cx={x - 7}
                      cy={35 + flag * 10}
                      r={3}
                      className="tab-score-head"
                    />
                  </g>
                ),
              )}
            </>
          )}
        </g>
      ) : (
        <>
          <ellipse
            cx={x}
            cy={53}
            rx={5}
            ry={3.5}
            transform={`rotate(-20 ${x} 53)`}
            className={
              event.duration <= 2 ? "tab-score-head-open" : "tab-score-head"
            }
          />
          {event.duration !== 1 && <path d={`M ${x + 4} 52 V 26`} />}
          {Array.from({ length: flags }, (_, flag) => (
            <path key={flag} d={`M ${x + 4} ${26 + flag * 7} q 13 5 7 14`} />
          ))}
        </>
      )}
      {event.dotted && (
        <circle cx={x + 12} cy={51} r={2} className="tab-score-head" />
      )}
      {event.triplet && (
        <text x={x} y={19} textAnchor="middle">
          3
        </text>
      )}
      <text x={x} y={75} textAnchor="middle" className="tab-score-duration">
        {rhythmLabel(event)}
      </text>
    </g>
  );
}
