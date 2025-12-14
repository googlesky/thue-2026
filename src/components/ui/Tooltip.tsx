'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
}

export default function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible]);

  // Auto-adjust position if out of viewport
  useEffect(() => {
    if (!isVisible || !containerRef.current || !popoverRef.current) return;

    const trigger = containerRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let newPosition = position;

    if (position === 'top' && trigger.top - popover.height - 8 < 0) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && trigger.bottom + popover.height + 8 > viewport.height) {
      newPosition = 'top';
    } else if (position === 'left' && trigger.left - popover.width - 8 < 0) {
      newPosition = 'right';
    } else if (position === 'right' && trigger.right + popover.width + 8 > viewport.width) {
      newPosition = 'left';
    }

    setAdjustedPosition(newPosition);
  }, [isVisible, position]);

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50';

    switch (adjustedPosition) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 mt-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-white border-gray-200 transform rotate-45';

    switch (adjustedPosition) {
      case 'top':
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2 border-b border-r`;
      case 'bottom':
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2 border-t border-l`;
      case 'left':
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2 border-t border-r`;
      case 'right':
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2 border-b border-l`;
      default:
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2 border-t border-l`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(!isVisible);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded-full"
        aria-expanded={isVisible}
        aria-haspopup="true"
      >
        {children}
      </button>

      {isVisible && (
        <div
          ref={popoverRef}
          className={getPositionClasses()}
          role="tooltip"
        >
          <div className="relative bg-white text-gray-700 text-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 max-w-xs animate-in fade-in zoom-in-95 duration-150">
            {content}
            <div className={getArrowClasses()} />
          </div>
        </div>
      )}
    </div>
  );
}
