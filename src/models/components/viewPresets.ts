// src/models/components/viewPresets.ts

export interface ViewPreset {
  id: string;
  name: string;
  is_default: boolean;
  filters: unknown;
}

/* ----------------------------- Requests / Responses ---------------------------- */

export type GetViewPresetsResponse = ViewPreset[];

export interface AddViewPresetRequest {
  name: string;
  is_default?: boolean;
  filters: unknown;
}
export type AddViewPresetResponse = ViewPreset;

export interface EditViewPresetRequest {
  name?: string;
  is_default?: boolean;
  filters?: unknown;
}
export type EditViewPresetResponse = ViewPreset;
