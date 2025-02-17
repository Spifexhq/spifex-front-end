import React from 'react';

export interface CheckboxProps {
  checked: boolean;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  colorClass?: string;
}
