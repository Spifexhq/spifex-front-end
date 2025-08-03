/**
 * Button.tsx
 * 
 * This component renders a customizable button with support for different variants,
 * loading state, and additional styling.
 * 
 * Features:
 * - Supports multiple button variants (e.g., "primary")
 * - Displays a loading spinner when `isLoading` is true
 * - Uses CSS modules for styling
 * - Accepts additional custom styles and class names
 * - Uses `classnames` to dynamically apply styles
 * 
 * Usage:
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>Click Me</Button>
 * <Button variant="primary" isLoading loaderColor="white">Loading...</Button>
 * ```
 */

import React from 'react';
import styles from './Button.module.css';
import { ButtonProps } from './Button.types';
import classNames from 'classnames';
import { InlineLoader } from '@/components/Loaders';

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  isLoading, 
  loaderColor, 
  children, 
  style, 
  className, 
  ...rest 
}) => {
  // Combines different CSS classes based on the button variant and loading/disabled state
  const buttonClasses = classNames(styles.button, styles[variant], className, {
    [styles.disabled]: isLoading || rest.disabled,
  });

  return (
    // Renders the button with dynamic classes and inline styles
    <button className={`${buttonClasses} px-4 py-2`} style={style} type='button' disabled={isLoading || rest.disabled} {...rest}>
      {/* Displays a loading spinner if isLoading is true, otherwise shows the button content */}
      {isLoading ? <InlineLoader color={loaderColor} /> : children}
    </button>
  );
};

export default Button;
