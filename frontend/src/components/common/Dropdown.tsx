import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  position?: 'left' | 'right';
  width?: 'auto' | 'sm' | 'md' | 'lg';
  closeOnClick?: boolean;
  className?: string;
}

const widthClasses = {
  auto: '',
  sm: 'w-48',
  md: 'w-56',
  lg: 'w-64'
};

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  position = 'left',
  width = 'md',
  closeOnClick = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    
    item.onClick?.();
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5
            ${position === 'left' ? 'left-0' : 'right-0'}
            ${widthClasses[width]}
          `}
        >
          <div className="py-1" role="menu">
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.divider && index > 0 && (
                  <div className="my-1 border-t border-gray-200" />
                )}
                <button
                  className={`
                    w-full text-left px-4 py-2 text-sm
                    ${item.danger ? 'text-red-600' : 'text-gray-700'}
                    ${item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-100 hover:text-gray-900'
                    }
                    flex items-center gap-2
                  `}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  role="menuitem"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Dropdown with header/footer
export interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  position?: 'left' | 'right';
  width?: 'auto' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  trigger,
  position = 'left',
  width = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5
            ${position === 'left' ? 'left-0' : 'right-0'}
            ${widthClasses[width]}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
};