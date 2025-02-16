// Button.tsx

import React from 'react';
import styles from './Button.module.css';
import { ButtonProps } from './Button.types';
import classNames from 'classnames';
import InlineLoader from '@/components/InlineLoader';

const Button: React.FC<ButtonProps> = ({ variant = 'primary', isLoading, loaderColor, children, style, ...rest }) => {
  // Combines different CSS classes based on the button variant and loading/disabled state
  const buttonClasses = classNames(styles.button, styles[variant], {
    [styles.disabled]: isLoading || rest.disabled,
  });

  return (
    // Renders the button with dynamic classes and inline styles
    <button className={buttonClasses} style={style} disabled={isLoading || rest.disabled} {...rest}>
      {/* Displays a loading spinner if isLoading is true, otherwise shows the button content */}
      {isLoading ? <InlineLoader color={loaderColor} /> : children}
    </button>
  );
};

export default Button;
