'use client';

import { useState, useRef, useEffect, useId, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
}

export default function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  // Dịch ngang (px) để popover không tràn mép màn hình hẹp
  const [shiftX, setShiftX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

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
    if (!isVisible) {
      setShiftX(0);
      return;
    }
    if (!containerRef.current || !popoverRef.current) return;

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

    // Kẹp popover trong khung nhìn (cách mép 8px); đo lúc chưa dịch (shiftX = 0)
    const margin = 8;
    let shift = 0;
    if (popover.right > viewport.width - margin) shift = viewport.width - margin - popover.right;
    if (popover.left + shift < margin) shift = margin - popover.left;
    setShiftX(shift);
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
        aria-label="Giải thích thêm"
        aria-expanded={isVisible}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </button>

      {isVisible && (
        <div
          ref={popoverRef}
          id={tooltipId}
          className={getPositionClasses()}
          style={shiftX ? { marginLeft: shiftX } : undefined}
          role="tooltip"
        >
          <div className="relative bg-gray-800 text-white text-xs rounded-md px-3 py-2 shadow-lg w-max max-w-[80vw] sm:max-w-sm">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
