'use client';

import React, { memo } from 'react';

interface LoadingSpinnerProps {
  /** Size of the spinner: 'sm' (16px), 'md' (24px), 'lg' (32px), 'xl' (48px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional text to display below the spinner */
  text?: string;
  /** Whether to show a full-height container */
  fullHeight?: boolean;
  /** Custom className for the container */
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const borderSizeMap = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
  xl: 'border-4',
};

/**
 * LoadingSpinner - A reusable loading indicator component
 * Used as fallback during lazy-loaded component transitions
 */
function LoadingSpinner({
  size = 'lg',
  text,
  fullHeight = false,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${fullHeight ? 'min-h-[300px]' : 'py-8'} ${className}`}
      role="status"
      aria-label={text || 'Loading...'}
    >
      <div
        className={`${sizeMap[size]} ${borderSizeMap[size]} border-gray-200 border-t-primary-600 rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-3 text-sm text-gray-500 animate-pulse">{text}</p>
      )}
    </div>
  );
}

export default memo(LoadingSpinner);

// Shimmer skeleton bar class
const shimmerClass = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer';

// TabLoadingSkeleton - A more detailed skeleton for tab content loading
export const TabLoadingSkeleton = memo(function TabLoadingSkeleton() {
  return (
    <div className="card" role="status" aria-label="Loading tab content...">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-xl ${shimmerClass}`} />
        <div className="flex-1">
          <div className={`h-5 rounded w-1/3 mb-2 ${shimmerClass}`} />
          <div className={`h-3 rounded w-1/2 ${shimmerClass}`} />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className={`h-4 rounded w-1/4 ${shimmerClass}`} />
            <div className={`h-10 rounded ${shimmerClass}`} />
          </div>
          <div className="space-y-3">
            <div className={`h-4 rounded w-1/3 ${shimmerClass}`} />
            <div className={`h-10 rounded ${shimmerClass}`} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className={`h-24 rounded-lg ${shimmerClass}`} />
          <div className={`h-24 rounded-lg ${shimmerClass}`} />
          <div className={`h-24 rounded-lg ${shimmerClass}`} />
        </div>
      </div>
    </div>
  );
});

// ChartLoadingSkeleton - Skeleton specifically for chart loading
export const ChartLoadingSkeleton = memo(function ChartLoadingSkeleton() {
  return (
    <div className="card" role="status" aria-label="Loading chart...">
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-6 h-6 rounded ${shimmerClass}`} />
        <div className={`h-5 rounded w-1/4 ${shimmerClass}`} />
      </div>
      <div className={`h-80 rounded-lg flex items-center justify-center ${shimmerClass}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    </div>
  );
});

// ResultLoadingSkeleton - Skeleton for result displays
export const ResultLoadingSkeleton = memo(function ResultLoadingSkeleton() {
  return (
    <div className="card" role="status" aria-label="Loading results...">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className={`h-4 rounded w-1/4 ${shimmerClass}`} />
          <div className={`h-6 rounded w-1/3 ${shimmerClass}`} />
        </div>
        <div className="flex justify-between items-center">
          <div className={`h-4 rounded w-1/5 ${shimmerClass}`} />
          <div className={`h-6 rounded w-1/4 ${shimmerClass}`} />
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <div className={`h-5 rounded w-1/3 ${shimmerClass}`} />
            <div className={`h-8 rounded w-1/3 ${shimmerClass}`} />
          </div>
        </div>
      </div>
    </div>
  );
});
