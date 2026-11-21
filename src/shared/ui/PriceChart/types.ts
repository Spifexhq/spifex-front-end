import type { CSSProperties, ReactNode } from "react";

/** Session phase of a sample. Only `after-hours` is rendered as a separate muted series. */
export type PricePhase = "regular" | "after-hours";

export type PricePoint = {
  /** Axis key: label, timestamp or date. Only used for ordering and header text. */
  t: string | number | Date;
  value: number;
  phase?: PricePhase;
  volume?: number | null;
};

export type PriceRange = {
  key: string;
  label: string;
  points: PricePoint[];
  /** Overrides the chart-level reference for this range. */
  reference?: number;
};

export type PriceChartTone = "light" | "dark";

/** Extra stroke-only series sharing the primary range's x axis. */
export type PriceLineSeries = {
  key: string;
  label?: ReactNode;
  color: string;
  values: Array<number | null>;
};

/** Pill definition when the pills control something other than the data ranges. */
export type PriceChartTab = { key: string; label: ReactNode };

export type PriceChartLabels = {
  afterHours: string;
  volume: string;
  empty: string;
};

export type PriceChartProps = {
  ranges: PriceRange[];
  /** Key of the selected range. */
  range: string;
  /** Required unless `tabs` replaces the pill row. */
  onRangeChange?(key: string): void;
  /** Previous close / period start used for the header delta. Defaults to the first point. */
  reference?: number;
  title?: ReactNode;
  /** Rendered next to the title, outside the truncating text block. */
  titleAside?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  /** Extra stroke-only series drawn over the primary area. */
  lines?: PriceLineSeries[];
  /** Replaces the range pills with a control-only pill row. */
  tabs?: PriceChartTab[];
  tab?: string;
  onTabChange?(key: string): void;
  tabsLabel?: string;
  tone?: PriceChartTone;
  height?: number;
  showVolume?: boolean;
  /** Draws the surface background and border from the tone tokens. */
  surface?: boolean;
  /** Animates the price, delta and percentage between values. */
  animateNumbers?: boolean;
  valueFormatter?: (value: number) => string;
  volumeFormatter?: (value: number) => string;
  dateFormatter?: (t: PricePoint["t"]) => string;
  /** Overrides the hover third line; receives the hovered sample index. */
  detailFormatter?: (index: number) => ReactNode;
  labels?: Partial<PriceChartLabels>;
  upColor?: string;
  downColor?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};
