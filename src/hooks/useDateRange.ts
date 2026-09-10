import { useCallback, useEffect, useMemo, useState } from "react";
import { enumerateDateKeys } from "../lib/dates";
import { RANGE_PRESETS, type RangePresetId, clampDateKey, windowForPreset } from "../lib/range";

export function useDateRange(minKey: string, maxKey: string) {
  const [preset, setPreset] = useState<RangePresetId>("31d");
  const [startKey, setStartKey] = useState("");
  const [endKey, setEndKey] = useState("");

  useEffect(() => {
    if (!minKey || !maxKey) return;
    if (preset === "custom") {
      setStartKey((s) => clampDateKey(s || minKey, minKey, maxKey));
      setEndKey((e) => clampDateKey(e || maxKey, minKey, maxKey));
      return;
    }
    const next = windowForPreset(preset, minKey, maxKey);
    setStartKey(next.startKey);
    setEndKey(next.endKey);
  }, [minKey, maxKey, preset]);

  const keys = useMemo(
    () => (minKey && maxKey ? enumerateDateKeys(minKey, maxKey) : []),
    [minKey, maxKey],
  );

  const setStartIndex = useCallback(
    (index: number) => {
      if (!keys.length) return;
      const next = keys[Math.max(0, Math.min(index, keys.length - 1))];
      setPreset("custom");
      setStartKey(next);
      setEndKey((end) => (next <= end ? end : next));
    },
    [keys],
  );

  const setEndIndex = useCallback(
    (index: number) => {
      if (!keys.length) return;
      const next = keys[Math.max(0, Math.min(index, keys.length - 1))];
      setPreset("custom");
      setEndKey(next);
      setStartKey((start) => (next >= start ? start : next));
    },
    [keys],
  );

  const startIndex = Math.max(0, keys.indexOf(startKey));
  const endIndex = keys.indexOf(endKey);

  return {
    preset,
    startKey,
    endKey,
    keys,
    startIndex,
    endIndex: endIndex < 0 ? Math.max(0, keys.length - 1) : endIndex,
    applyPreset: setPreset,
    setStartIndex,
    setEndIndex,
    presets: RANGE_PRESETS,
  };
}
