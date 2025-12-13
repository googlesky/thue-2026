'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let newPosition = position;

    // Check if tooltip goes out of viewport and adjust position
    if (position === 'top' && trigger.top - tooltip.height - 8 < 0) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && trigger.bottom + tooltip.height + 8 > viewport.height) {
      newPosition = 'top';
    } else if (position === 'left' && trigger.left - tooltip.width - 8 < 0) {
      newPosition = 'right';
    } else if (position === 'right' && trigger.right + tooltip.width + 8 > viewport.width) {
      newPosition = 'left';
    }

    setAdjustedPosition(newPosition);
  }, [isVisible, position]);

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 transition-opacity duration-200';

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
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';

    switch (adjustedPosition) {
      case 'top':
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`;
      case 'bottom':
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2`;
      case 'left':
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2`;
      case 'right':
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2`;
      default:
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`;
    }
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${getPositionClasses()} ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="relative bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-xs">
            {content}
            <div className={getArrowClasses()} />
          </div>
        </div>
      )}
    </div>
  );
}
