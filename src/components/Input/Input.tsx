import React, { useId, useState } from 'react';
import styles from './Input.module.css';
import { InputProps } from './Input.types';
import classNames from 'classnames';

const Input: React.FC<InputProps> = ({ variant = 'default', label, errorMessage, style, showTogglePassword = false, type = 'text', isLoading = false, ...rest }) => {
  const id = useId();  // Generates a unique ID to link the label to the input field
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);  // Manages the visibility state of the password

  // Toggles the password visibility between 'text' and 'password'
  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  // Combines different CSS classes based on the input variant and error state
  const inputClasses = classNames(styles.input, styles[variant], {
    [styles.error]: !!errorMessage,
  });

  return (
    <div className={styles.inputContainer} style={style}>
      {/* Renders a label if provided, linked to the input field via the unique ID */}
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}

      <div className={styles.inputWrapper}>
        {/* Input field with dynamic type and disabled state if loading */}
        <input
          id={id}
          className={inputClasses}
          type={showTogglePassword && type === 'password' ? (isPasswordVisible ? 'text' : 'password') : type}
          disabled={isLoading || rest.disabled}
          {...rest}
        />

        {/* Button to toggle password visibility if the input type is password */}
        {showTogglePassword && type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={styles.togglePasswordButton}
            disabled={isLoading}
          >
            {/* Displays different icons based on password visibility */}
            {isPasswordVisible ? (
              <img src="src/assets/Icons/password/not-visible.svg" alt='not-visible' width={20} />
            ) : (
              <img src="src/assets/Icons/password/visible.svg" alt='visible' width={20} />
            )}
          </button>
        )}
      </div>

      {/* Displays an error message if provided */}
      {errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
    </div>
  );
};

export default Input;
