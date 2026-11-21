import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FORECAST_RANGES, type ForecastDirection, type ForecastFilters, type ForecastLoader, type ForecastPayload, type RangeKey } from "./types";

function localISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Forward: today → today + days - 1 (what is due).
 * Backward: today - days → yesterday (what is already overdue).
 */
export function windowFor(rangeKey: RangeKey, direction: ForecastDirection = "forward") {
  const range = FORECAST_RANGES.find((item) => item.key === rangeKey) ?? FORECAST_RANGES[1];
  const start = new Date();
  const end = new Date();

  if (direction === "forward") {
    end.setDate(end.getDate() + range.days - 1);
  } else {
    start.setDate(start.getDate() - range.days);
    end.setDate(end.getDate() - 1);
  }

  return { start: localISO(start), end: localISO(end), groupBy: range.groupBy };
}

type State = { data: ForecastPayload | null; loading: boolean; failed: boolean };

/** Shared fetch lifecycle: stale responses are dropped, the previous payload is kept while loading. */
export function useForecast(
  rangeKey: RangeKey,
  direction: ForecastDirection,
  filters: ForecastFilters,
  load: ForecastLoader
) {
  const [state, setState] = useState<State>({ data: null, loading: true, failed: false });
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);

  const window = useMemo(() => windowFor(rangeKey, direction), [direction, rangeKey]);
  const category = filters.cashflow_category_id ?? "";
  const description = filters.description ?? "";

  useEffect(() => {
    const id = ++request.current;
    setState((previous) => ({ ...previous, loading: true, failed: false }));

    load(window, {
      ...(category ? { cashflow_category_id: category } : {}),
      ...(description ? { description } : {}),
    })
      .then((payload) => {
        if (id === request.current) setState({ data: payload, loading: false, failed: false });
      })
      .catch(() => {
        if (id !== request.current) return;
        setState((previous) => ({ ...previous, loading: false, failed: true }));
      });
  }, [category, description, load, nonce, window]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, window, reload };
}
