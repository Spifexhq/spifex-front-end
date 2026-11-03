import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCurrencies, type CurrencyOption } from "@/lib/currency/currencies";
import { Select } from "@/shared/ui/Select";

type Props = { value: string; onChange: (code: string) => void; label?: React.ReactNode; optional?: boolean };

/** Uses the same localized ISO currency catalogue as Currency Settings. */
export default function CurrencySelect({ value, onChange, label, optional = false }: Props) {
  const { t, i18n } = useTranslation("accountingSettings");
  const items = useMemo(() => {
    const currencies = getCurrencies(i18n.resolvedLanguage || i18n.language || "en");
    return optional ? [{ value: "", label: t("currency.inherit", "No account currency restriction") }, ...currencies] : currencies;
  }, [i18n.resolvedLanguage, i18n.language, optional, t]);
  return <Select<CurrencyOption>
    label={label ?? t("common.currency", "Currency")}
    items={items}
    selected={items.filter(item => item.value === value)}
    onChange={selected => onChange(selected[0]?.value ?? "")}
    getItemKey={item => item.value || "inherit"}
    getItemLabel={item => item.label}
    buttonLabel={t("currency.choose", "Choose currency")}
    singleSelect hideCheckboxes
  />;
}
