import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DialogShell from "@/shared/ui/DialogShell";
import Button from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";

export type CategoryImportLanguage = "en" | "pt" | "fr" | "de";

const LANGUAGES: CategoryImportLanguage[] = ["en", "pt", "fr", "de"];

function currentLanguage(value: string | undefined): CategoryImportLanguage {
  const base = String(value || "").trim().toLowerCase().split("-", 1)[0];
  return LANGUAGES.includes(base as CategoryImportLanguage)
    ? (base as CategoryImportLanguage)
    : "en";
}

export default function CategoryImportLanguageDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose(): void;
  onConfirm(language: CategoryImportLanguage): void;
}) {
  const { t, i18n } = useTranslation("common");
  const [language, setLanguage] = useState<CategoryImportLanguage>(() =>
    currentLanguage(i18n.resolvedLanguage || i18n.language)
  );

  useEffect(() => {
    if (open) {
      setLanguage(currentLanguage(i18n.resolvedLanguage || i18n.language));
    }
  }, [open, i18n.language, i18n.resolvedLanguage]);

  const options = LANGUAGES.map(value => ({
    value,
    label: t(`categoryImport.languages.${value}`),
  }));
  const selected = options.filter(option => option.value === language);

  return <DialogShell
    open={open}
    onClose={onClose}
    closeLabel={t("categoryImport.cancel")}
    title={t("categoryImport.title")}
    description={t("categoryImport.description")}
    busy={busy}
    maxWidthClass="max-w-md"
    bodyClassName="space-y-5 p-5 sm:p-6"
  >
    <Select<{ value: CategoryImportLanguage; label: string }>
      label={t("categoryImport.languageLabel")}
      ariaLabel={t("categoryImport.languageLabel")}
      items={options}
      selected={selected}
      onChange={items => setLanguage(items[0]?.value ?? "en")}
      getItemKey={item => item.value}
      getItemLabel={item => item.label}
      buttonLabel={t("categoryImport.languageLabel")}
      singleSelect
      hideCheckboxes
    />
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
        {t("categoryImport.cancel")}
      </Button>
      <Button type="button" onClick={() => onConfirm(language)} isLoading={busy} disabled={busy}>
        {busy ? t("categoryImport.importing") : t("categoryImport.import")}
      </Button>
    </div>
  </DialogShell>;
}
