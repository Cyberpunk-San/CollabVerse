import React from 'react';

export interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const colorMap = {
  primary: 'text-indigo-600',
  secondary: 'text-purple-600',
  white: 'text-white',
  gray: 'text-gray-400'
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  color = 'primary',
  type = 'spinner',
  text,
  fullScreen = false,
  className = ''
}) => {
  const renderSpinner = () => (
    <svg
      className={`animate-spin ${sizeMap[size]} ${colorMap[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${sizeMap[size]} 
            ${colorMap[color]} 
            bg-current rounded-full
            animate-bounce
          `}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeMap[size]} 
          ${colorMap[color]} 
          bg-current rounded-full
          animate-pulse
        `}
      />
    </div>
  );

  const renderSkeleton = () => (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="text-center">
          {renderContent()}
          {text && <p className="mt-4 text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center space-x-3">
        {renderContent()}
        <span className={`text-sm ${colorMap[color]}`}>{text}</span>
      </div>
    );
  }

  return renderContent();
};

export default Loading;

// Specialized loading components
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <Loading size="lg" type="spinner" text={text} fullScreen />
);

export const ButtonLoader: React.FC = () => (
  <Loading size="sm" type="spinner" color="white" />
);

export const SkeletonLoader: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
    ))}
  </div>
);