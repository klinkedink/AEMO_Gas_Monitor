import type { CSSProperties } from "react";
import { formatLongDateKey } from "../lib/dates";
import type { RangePresetId } from "../lib/range";
import { RANGE_PRESETS } from "../lib/range";

interface Props {
  disabled?: boolean;
  preset: RangePresetId;
  startKey: string;
  endKey: string;
  startIndex: number;
  endIndex: number;
  maxIndex: number;
  onPreset: (id: RangePresetId) => void;
  onStartIndex: (index: number) => void;
  onEndIndex: (index: number) => void;
}

export function DateRangeControls({
  disabled,
  preset,
  startKey,
  endKey,
  startIndex,
  endIndex,
  maxIndex,
  onPreset,
  onStartIndex,
  onEndIndex,
}: Props) {
  const fillLeft = maxIndex <= 0 ? 0 : (startIndex / maxIndex) * 100;
  const fillRight = maxIndex <= 0 ? 100 : (endIndex / maxIndex) * 100;

  return (
    <section className="range-controls">
      <div className="preset-row">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`preset-btn ${preset === p.id ? "active" : ""}`}
            disabled={disabled}
            onClick={() => onPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="range-slider" style={{ "--fill-left": `${fillLeft}%`, "--fill-right": `${fillRight}%` } as CSSProperties}>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={startIndex}
          disabled={disabled || maxIndex <= 0}
          aria-label="Window start"
          onChange={(e) => onStartIndex(Number(e.target.value))}
        />
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={endIndex}
          disabled={disabled || maxIndex <= 0}
          aria-label="Window end"
          onChange={(e) => onEndIndex(Number(e.target.value))}
        />
      </div>
      <div className="range-labels">
        <span>{startKey ? formatLongDateKey(startKey) : "—"}</span>
        <span>{endKey ? formatLongDateKey(endKey) : "—"}</span>
      </div>
    </section>
  );
}
