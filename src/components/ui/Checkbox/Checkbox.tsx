/**
 * Checkbox.tsx
 * 
 * This component renders a customizable checkbox with different sizes, colors, 
 * and states (disabled, checked). It includes a checkmark icon when selected.
 * 
 * Features:
 * - Supports different sizes: small, medium, large
 * - Allows custom colors via CSS modules
 * - Accepts `onClick` and `onChange` handlers
 * - Can be disabled
 * 
 * Usage:
 * ```tsx
 * <Checkbox checked={true} onClick={handleClick} size="large" colorClass="myCustomColor" />
 * ```
 */

import React from 'react';
import styles from './Checkbox.module.css';
import { CheckboxProps } from './Checkbox.types';

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onClick,
  onChange,
  disabled = false,
  size = 'medium',
  colorClass = 'defaultColor',
}) => {
  // Determine which size class to apply
  let sizeClass = '';
  if (size === 'small') {
    sizeClass = styles.sizeSmall;
  } else if (size === 'sm') {
    sizeClass = styles.sizeSM;
  } else if (size === 'large') {
    sizeClass = styles.sizeLarge;
  }
  // If it is medium, we leave the default class (20px x 20px) defined in .checkboxInput

  // Assemble the final classes for <input>, which can include color and size
  const inputClasses = [
    styles.checkboxInput,
    sizeClass,
    styles[colorClass] || '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.checkboxContainer}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => {
            if (onClick) onClick(e);
          }}
          onChange={(e) => {
            if (onChange) onChange(e);
          }}
          disabled={disabled}
          className={inputClasses}
        />
        {/* Check icon */}
        <span className={styles.checkIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 
                 1.414l-8 8a1 1 0 01-1.414 
                 0l-4-4a1 1 0 011.414-1.414L8 
                 12.586l7.293-7.293a1 1 
                 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </label>
    </div>
  );
};

export default Checkbox;
