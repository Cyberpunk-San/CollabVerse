import React, { useState } from 'react';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square' | 'rounded';
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
  username?: string;
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

const shapeMap = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg'
};

const statusColorMap = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500'
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  shape = 'circle',
  status = null,
  username,
  className = '',
  onClick
}) => {
  const [imageError, setImageError] = useState(false);

  // Generate initials from username or alt
  const getInitials = (): string => {
    if (username) {
      return username
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (alt !== 'Avatar') {
      return alt
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '?';
  };

  // Generate a consistent color based on username
  const getBackgroundColor = (): string => {
    if (!username && alt === 'Avatar') return 'bg-gray-400';
    
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    
    const str = username || alt;
    const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="relative inline-flex">
      <div
        className={`
          ${sizeMap[size]} 
          ${shapeMap[shape]} 
          ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
          overflow-hidden flex items-center justify-center
          ${!src || imageError ? getBackgroundColor() : ''}
          ${className}
        `}
        onClick={onClick}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-white font-medium">
            {getInitials()}
          </span>
        )}
      </div>
      
      {status && (
        <span
          className={`
            absolute bottom-0 right-0 block
            ${statusColorMap[status]}
            rounded-full ring-2 ring-white
            ${size === 'xs' ? 'w-1.5 h-1.5' : ''}
            ${size === 'sm' ? 'w-2 h-2' : ''}
            ${size === 'md' ? 'w-2.5 h-2.5' : ''}
            ${size === 'lg' ? 'w-3 h-3' : ''}
            ${size === 'xl' ? 'w-4 h-4' : ''}
          `}
          title={status}
        />
      )}
    </div>
  );
};