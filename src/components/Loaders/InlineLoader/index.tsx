/**
 * InlineLoader.tsx
 * 
 * This component renders a small cube-style loader that can be used inline.
 * 
 * Features:
 * - Customizable cube color via the `color` prop
 * - Supports additional custom styles and CSS classes
 * - Uses animated cubes for a smooth loading effect
 * 
 * Usage:
 * ```tsx
 * <InlineLoader />
 * <InlineLoader color="#ff0000" className="custom-loader" />
 * ```
 */

import React from 'react';
import './styles.css';

interface InlineLoaderProps {
  // Color of loader cubes. Default: #202020
  color?: string;

  // Inline styles for custom styling
  style?: React.CSSProperties;

  // Custom CSS class for additional styling
  className?: string;
}

const InlineLoader: React.FC<InlineLoaderProps> = ({ color = "#202020", style, className }) => {
  // Define a style object for the cubes
  const cubeStyle: React.CSSProperties = {
    backgroundColor: color,
  };

  return (
    <div
      className={`InlineLoader-cubes ${className ?? "w-5 h-5"}`}
      style={style}
    >
      <div className="sk-cube sk-cube1" style={cubeStyle}></div>
      <div className="sk-cube sk-cube2" style={cubeStyle}></div>
      <div className="sk-cube sk-cube3" style={cubeStyle}></div>
      <div className="sk-cube sk-cube4" style={cubeStyle}></div>
      <div className="sk-cube sk-cube5" style={cubeStyle}></div>
      <div className="sk-cube sk-cube6" style={cubeStyle}></div>
      <div className="sk-cube sk-cube7" style={cubeStyle}></div>
      <div className="sk-cube sk-cube8" style={cubeStyle}></div>
      <div className="sk-cube sk-cube9" style={cubeStyle}></div>
    </div>
  );
};

export default InlineLoader;
