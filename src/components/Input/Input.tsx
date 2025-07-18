/**
 * Input.tsx
 * 
 * This component renders a customizable input field with optional features such as:
 * - Label support
 * - Error message display
 * - Password visibility toggle
 * - Multiple input variants (default, outlined, filled)
 * - Loading state
 * 
 * Features:
 * - Uses `useId` to generate a unique ID for accessibility
 * - Dynamically applies styles based on the input type and variant
 * - Supports a password visibility toggle when `showTogglePassword` is enabled
 * - Handles loading and disabled states
 * 
 * Usage:
 * ```tsx
 * <Input label="Username" placeholder="Enter your name" />
 * <Input type="password" label="Password" showTogglePassword />
 * <Input variant="outlined" errorMessage="This field is required" />
 * ```
 */

import { useId, useState, forwardRef } from 'react';
import styles from './Input.module.css';
import { InputProps } from './Input.types';
import classNames from 'classnames';

const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  variant = 'default', 
  label, 
  errorMessage, 
  style, 
  showTogglePassword = false, 
  type = 'text', 
  isLoading = false, 
  ...rest 
}, ref) => {
  const id = useId();  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  const inputClasses = classNames(styles.input, styles[variant], {
    [styles.error]: !!errorMessage,
  });

  return (
    <div className={styles.inputContainer} style={style}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}

      <div className={styles.inputWrapper}>
        <input
          id={id}
          className={`${inputClasses} placeholder-gray-400`}
          type={showTogglePassword && type === 'password' ? (isPasswordVisible ? 'text' : 'password') : type}
          disabled={isLoading || rest.disabled}
          ref={ref} // <-- Agora a ref está sendo passada corretamente
          {...rest}
        />

        {showTogglePassword && type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={styles.togglePasswordButton}
            disabled={isLoading}
            tabIndex={-1}
          >
            {isPasswordVisible ? (
              <img src="src/assets/Icons/password/not-visible.svg" alt='not-visible' width={20} />
            ) : (
              <img src="src/assets/Icons/password/visible.svg" alt='visible' width={20} />
            )}
          </button>
        )}
      </div>

      {errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
    </div>
  );
});

// Define um display name para facilitar debugging
Input.displayName = "Input";

export default Input;
