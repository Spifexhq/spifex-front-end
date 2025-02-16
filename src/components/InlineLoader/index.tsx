import React from 'react';
import './styles.css';

interface InlineLoaderProps {
/** Color of loader cubes. Default: #202020 */
  color?: string;
}

const InlineLoader: React.FC<InlineLoaderProps> = ({ color = "#202020" }) => {
  // Define a style object for the cubes
  const cubeStyle = { backgroundColor: color };

  return (
    <div className="InlineLoader-cubes">
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
