// Button.types.ts

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loaderColor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
