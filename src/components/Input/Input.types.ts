export type InputVariant = 'default' | 'outlined' | 'filled' | 'error';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  errorMessage?: string;
  style?: React.CSSProperties;
  showTogglePassword?: boolean;
  isLoading?: boolean;
}