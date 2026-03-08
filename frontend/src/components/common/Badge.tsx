import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'gray';
  size?: 'sm' | 'md';
  rounded?: 'full' | 'lg';
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantClasses = {
  primary: 'bg-indigo-100 text-indigo-800',
  secondary: 'bg-purple-100 text-purple-800',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-800'
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
};

const roundedClasses = {
  full: 'rounded-full',
  lg: 'rounded-lg'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  icon,
  removable = false,
  onRemove,
  className = ''
}) => {
  return (
    <span
      className={`
        inline-flex items-center font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${roundedClasses[rounded]}
        ${className}
      `}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className={`
            ml-1.5 inline-flex items-center justify-center
            hover:bg-opacity-20 hover:bg-black rounded-full
            focus:outline-none
          `}
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </span>
  );
};

// Badge count for notifications
export const BadgeCount: React.FC<{
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  className?: string;
}> = ({ count, max = 99, variant = 'danger', className = '' }) => {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge variant={variant} size="sm" rounded="full" className={className}>
      {displayCount}
    </Badge>
  );
};