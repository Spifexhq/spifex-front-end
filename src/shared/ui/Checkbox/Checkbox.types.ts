import React from 'react';

export interface CheckboxProps extends Pick<React.InputHTMLAttributes<HTMLInputElement>, "aria-label" | "aria-describedby" | "id" | "name"> {
  indeterminate?: boolean;
  checked: boolean;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  size?: 'small' | 'sm' | 'medium' | 'large';
  required?: boolean;
}
