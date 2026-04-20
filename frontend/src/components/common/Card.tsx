import React from 'react';
import { Skeleton } from './Skeleton.tsx';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  className?: string;
  loading?: boolean;
  skeletonLines?: number;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  noPadding = false,
  bordered = true,
  hoverable = false,
  className = '',
  loading = false,
  skeletonLines = 3,
  onClick
}) => {
  const baseClasses = 'card overflow-hidden animate-slide-in-up';
  const borderClasses = '';
  const hoverClasses = hoverable ? 'hover-lift cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const renderSkeleton = () => (
    <div className="space-y-3">
      {title && (
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          {headerAction && <Skeleton className="h-8 w-20" />}
        </div>
      )}
      {Array.from({ length: skeletonLines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );

  return (
    <div
      className={`
        ${baseClasses}
        ${borderClasses}
        ${hoverClasses}
        ${clickableClasses}
        rounded-xl
        ${className}
      `}
      onClick={onClick}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}

      <div className={noPadding ? '' : 'px-6 py-4'}>
        {loading ? renderSkeleton() : children}
      </div>

      {footer && !loading && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          {footer}
        </div>
      )}
    </div>
  );
};