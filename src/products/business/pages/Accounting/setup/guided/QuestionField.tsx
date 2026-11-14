import { useTranslation } from "react-i18next";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import Textarea from "@/shared/ui/Input/Textarea";
import { Select } from "@/shared/ui/Select";
import type { AiSetupQuestion } from "@/models/settings/accountingAiSetup";

type Answer = string | string[] | boolean;

export default function QuestionField({ question, value, onChange, otherValue, onOtherChange, options: optionOverride }: {
  question: AiSetupQuestion;
  value: Answer | undefined;
  onChange(value: Answer): void;
  otherValue?: string;
  onOtherChange?(value: string): void;
  options?: Array<{ value: string; label: string }>;
}) {
  const { t } = useTranslation("accountingSettings");
  const label = t(`guidedSetup.questions.${question.key}.label`);
  const help = t(`guidedSetup.questions.${question.key}.help`);
  const options = optionOverride ?? question.options.map(option => ({ value: option.value, label: t(option.label_key) }));

  if (optionOverride) {
    const selectedValue = typeof value === "string" ? value : "";
    return <div className="space-y-1.5">
      <Select<{ value: string; label: string }>
        label={label}
        buttonLabel={label}
        items={options}
        selected={options.filter(option => option.value === selectedValue)}
        onChange={items => onChange(items[0]?.value || "")}
        getItemKey={item => item.value}
        getItemLabel={item => item.label}
        singleSelect
        hideCheckboxes
        required={question.required}
      />
      {help ? <p className="text-xs leading-5 text-gray-500">{help}</p> : null}
    </div>;
  }

  if (question.type === "boolean") {
    return <label className="flex min-h-14 items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:border-gray-300">
      <Checkbox checked={value === true} onChange={event => onChange(event.target.checked)} />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-gray-900">{label}</span>
        {help ? <span className="mt-0.5 block text-xs leading-5 text-gray-500">{help}</span> : null}
      </span>
    </label>;
  }

  if (question.type === "text" || question.type === "textarea") {
    const text = typeof value === "string" ? value : "";
    return question.type === "textarea"
      ? <div className="space-y-1.5"><Textarea label={label} value={text} onChange={event => onChange(event.target.value)} maxLength={question.max_length || 500}/>{help ? <p className="text-xs leading-5 text-gray-500">{help}</p> : null}</div>
      : <div className="space-y-1.5"><Input kind="text" label={label} value={text} onChange={event => onChange(event.target.value)} maxLength={question.max_length || 255}/>{help ? <p className="text-xs leading-5 text-gray-500">{help}</p> : null}</div>;
  }

  if (question.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    const showOther = selected.includes("other");
    return <div className="space-y-1.5">
      <Select<{ value: string; label: string }>
        label={label}
        buttonLabel={label}
        items={options}
        selected={options.filter(option => selected.includes(option.value))}
        onChange={items => onChange(items.map(item => item.value))}
        getItemKey={item => item.value}
        getItemLabel={item => item.label}
        hideCheckboxes={false}
      />
      {showOther && onOtherChange ? <Input kind="text" label={t("guidedSetup.otherExplanation")} value={otherValue || ""} onChange={event => onOtherChange(event.target.value)} maxLength={160} required /> : null}
      {help ? <p className="text-xs leading-5 text-gray-500">{help}</p> : null}
    </div>;
  }

  const selected = typeof value === "string" ? value : "";
  return <div className="space-y-1.5">
    <Select<{ value: string; label: string }>
      label={label}
      buttonLabel={label}
      items={options}
      selected={options.filter(option => option.value === selected)}
      onChange={items => onChange(items[0]?.value || "")}
      getItemKey={item => item.value}
      getItemLabel={item => item.label}
      singleSelect
      hideCheckboxes
    />
    {selected === "other" && onOtherChange ? <Input kind="text" label={t("guidedSetup.otherExplanation")} value={otherValue || ""} onChange={event => onOtherChange(event.target.value)} maxLength={160} required /> : null}
    {help ? <p className="text-xs leading-5 text-gray-500">{help}</p> : null}
  </div>;
}
