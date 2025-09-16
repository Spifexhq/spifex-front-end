import {
  useId,
  useState,
  forwardRef,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import classNames from "classnames";
import type { InputProps } from "./Input.types";
import visible from "@/assets/Icons/password/visible.svg";
import notVisible from "@/assets/Icons/password/not-visible.svg";

type Variant = "default" | "outlined" | "filled";

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
      label,
      errorMessage,
      style,
      showTogglePassword = false,
      type = "text",
      isLoading = false,
      ...rest
    },
    ref
  ) => {
    const id = useId();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isPassword = showTogglePassword && type === "password";
    const inputType = isPassword ? (isPasswordVisible ? "text" : "password") : type;

    const baseInput =
      "w-full text-xs text-gray-800 px-4 py-3 rounded-[5px] outline-none " +
      "transition-all duration-200 ease-in-out placeholder-gray-400 " +
      "border focus:border-gray-400 " +
      "hover:bg-gray-50 focus:bg-gray-50 " +
      "disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed";

    const variantClasses: Record<Variant, string> = {
      default: "bg-white border-gray-300",
      outlined: "bg-white border-2 border-indigo-600",
      filled: "bg-gray-100 border border-transparent",
    };

    const errorClasses =
      errorMessage ? "border-red-500 focus:border-red-500" : undefined;

    const inputClasses = classNames(
      baseInput,
      variantClasses[variant as Variant] ?? variantClasses.default,
      errorClasses,
      { "pr-10": isPassword }
    );

    const togglePasswordVisibility = () =>
      setIsPasswordVisible((v) => !v);

    // Evita submit ao pressionar Enter dentro de formulário se necessário
    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && rest.formNoValidate) e.preventDefault();
    };

    return (
      <div className="flex flex-col gap-1" style={style}>
        {label ? (
          <label
            htmlFor={id}
            className="text-[10px] py-[5px] font-bold select-none text-gray-700"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={inputType}
            className={inputClasses}
            aria-invalid={!!errorMessage}
            disabled={isLoading || rest.disabled}
            onKeyDown={handleKeyDown}
            {...rest}
          />

          {isPassword && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0 text-indigo-600 disabled:opacity-50"
              disabled={isLoading}
              tabIndex={-1}
              aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
            >
              {isPasswordVisible ? (
                <img src={notVisible} alt="not-visible" width={20} />
              ) : (
                <img src={visible} alt="visible" width={20} />
              )}
            </button>
          )}
        </div>

        {errorMessage ? (
          <span className="text-red-500 text-xs">{errorMessage}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
