import { forwardRef } from "react";
import type { InputProps, AmountInputProps, DateInputProps, TextInputProps } from "./Input.types";

import TextInput from "./TextInput";
import AmountField from "./AmountField";
import DateField from "./DateField";

function isAmount(props: InputProps): props is AmountInputProps {
  return props.kind === "amount";
}

function isDate(props: InputProps): props is DateInputProps {
  return props.kind === "date";
}

function isText(props: InputProps): props is TextInputProps {
  return props.kind === "text" || props.kind == null;
}

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  if (isAmount(props)) return <AmountField {...props} ref={ref} />;
  if (isDate(props)) return <DateField {...props} ref={ref} />;
  if (isText(props)) return <TextInput {...props} ref={ref} />;
  return <TextInput {...(props as TextInputProps)} ref={ref} />;
});

Input.displayName = "Input";
export default Input;
