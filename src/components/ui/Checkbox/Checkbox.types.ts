import React from 'react';

export interface CheckboxProps {
  checked: boolean;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  size?: 'small' | 'sm' | 'medium' | 'large';
  colorClass?: string;
  required?: boolean;
}
