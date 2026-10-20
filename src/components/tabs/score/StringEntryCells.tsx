import { emptySlots } from "../../../lib/tabEditing";
import { measureTicks } from "../../../lib/tablature";
import { activate, LEFT, RIGHT, TOP, ROW, orderedLanes } from "./scoreShared";
import type { TabScoreViewProps } from "./scoreShared";

export function StringEntryCells(
  p: TabScoreViewProps & { measureIndex: number; width: number },
) {
  if (!p.onEmptyClick || !p.entryRhythm) return null;
  const total = measureTicks(p.score.meter);
  const available = p.width - LEFT - RIGHT;
  const lanes = orderedLanes(p.score, p.tuning);
  const x = (tick: number) => LEFT + (tick / total) * available;
  const activeLane = lanes.findIndex((lane) => lane.id === p.selectedLane);
  return (
    <>
      {emptySlots(p.score, p.measureIndex, p.entryRhythm).map(
        ({ tick, ticks }) => (
          <g key={tick}>
            {lanes.map((lane, i) => (
              <g
                key={lane.id}
                className="tab-entry-cell"
                role="button"
                tabIndex={0}
                aria-label={`Такт ${p.measureIndex + 1}, позиция ${Number((tick / 480 + 1).toFixed(2))}, струна ${lane.label}: ввести ноту`}
                onClick={(e) => {
                  e.stopPropagation();
                  p.onEmptyClick!(p.measureIndex, tick, lane.id);
                }}
                onKeyDown={(e) =>
                  activate(e, () =>
                    p.onEmptyClick!(p.measureIndex, tick, lane.id),
                  )
                }
              >
                <rect
                  x={x(tick) - 17}
                  y={TOP + i * ROW - ROW / 2}
                  width={Math.max(32, (ticks / total) * available - 2)}
                  height={ROW}
                  rx={4}
                />
                <text x={x(tick)} y={TOP + i * ROW + 6} textAnchor="middle">
                  ·
                </text>
              </g>
            ))}
          </g>
        ),
      )}
      {p.selectedMeasure === p.measureIndex &&
        p.selectedTick !== undefined &&
        p.selectedTick < total &&
        activeLane >= 0 && (
          <g
            className="tab-input-cursor"
            pointerEvents="none"
            data-cursor="true"
          >
            <rect
              x={x(p.selectedTick) - 17}
              y={TOP + activeLane * ROW - 14}
              width={34}
              height={28}
              rx={5}
            />
            <path
              d={`M ${x(p.selectedTick) - 6} ${TOP + activeLane * ROW + 17} H ${x(p.selectedTick) + 6}`}
            />
          </g>
        )}
    </>
  );
}
