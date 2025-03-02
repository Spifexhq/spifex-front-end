import React, { useRef } from 'react';

interface ResizableTHProps {
  /** Which column index are we? (Matches the colWidths array index in the parent) */
  colIndex: number;
  /** If false, do NOT show the handle or do any resizing */
  isResizable: boolean;
  /** Handler to pass the pixel delta */
  onResize: (index: number, deltaX: number) => void;
  /** Additional classes for styling */
  className?: string;
  /** Header label / child node */
  children?: React.ReactNode;
}

const ResizableTH: React.FC<ResizableTHProps> = ({
  colIndex,
  isResizable,
  onResize,
  className = '',
  children,
}) => {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // If not resizable, do nothing
    if (!isResizable) return;

    isDraggingRef.current = true;
    startXRef.current = e.clientX;

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Also prevent the mouseDown from selecting text
    e.preventDefault();
    e.stopPropagation();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    // deltaX = how much we've moved horizontally
    const deltaX = e.clientX - startXRef.current;
    if (Math.abs(deltaX) > 0) {
      onResize(colIndex, deltaX);
      // Reset the startX to current, so it feels continuous
      startXRef.current = e.clientX;
    }
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;

    // Restore text selection
    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  if (!isResizable) {
    // Just render a normal TH with no handle
    return (
      <th className={`border-b border-gray-200 ${className}`}>
        <div className="flex items-center justify-center">{children}</div>
      </th>
    );
  }

  return (
    <th className={`relative border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-center">{children}</div>
      {/* Only show the handle if resizable */}
      <div
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
        onMouseDown={onMouseDown}
        // Prevent the handle from capturing double-click or text selection
        onDragStart={(ev) => ev.preventDefault()}
      >
        {/* 
          A small vertical line:
          Hidden by default (opacity-0), appears on group hover (group-hover:opacity-100)
        */}
        <span
          className="
            absolute
            left-1/2
            top-1/2
            w-px
            h-4
            bg-gray-400
            -translate-x-1/2
            -translate-y-1/2
            opacity-0
            group-hover:opacity-100
            transition
          "
        />
        {/* A small diagonal mark (the "arrow"): also hidden by default */}
        <span
          className="
            absolute
            left-1/2
            top-1/2
            w-2
            h-2
            border-t
            border-r
            border-gray-400
            -translate-x-1/2
            -translate-y-1/2
            rotate-45
            opacity-0
            group-hover:opacity-100
            transition
          "
        />
      </div>
    </th>
  );
};

export default ResizableTH;
