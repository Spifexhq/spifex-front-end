import type { TFunction } from "i18next";

export type PersonalCategoryName = {
  name: string;
  code?: string | null;
  default_name?: string | null;
};

/**
 * Translate a default category by its stable code while preserving names the
 * user has edited in category settings.
 */
export function personalCategoryName(category: PersonalCategoryName, t: TFunction): string {
  const code = String(category.code || "").trim();
  if (!code || !category.default_name || category.default_name !== category.name) {
    return category.name;
  }
  return String(t(`categoryNames.${code}`, { defaultValue: category.name }));
}
