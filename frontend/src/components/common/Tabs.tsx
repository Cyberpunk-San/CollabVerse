import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
  activeTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'buttons';
  fullWidth?: boolean;
  className?: string;
}

const variantClasses = {
  underline: 'border-b border-gray-200 dark:border-gray-800',
  pills: 'space-x-2',
  buttons: 'space-x-2'
};

const tabVariantClasses = {
  underline: {
    base: 'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
    active: 'border-indigo-500 text-indigo-600 dark:text-indigo-400',
    inactive: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700',
    disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
  },
  pills: {
    base: 'px-4 py-2 text-sm font-medium rounded-md transition-colors',
    active: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
    inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
  },
  buttons: {
    base: 'px-4 py-2 text-sm font-medium rounded-md transition-colors border border-gray-300 dark:border-gray-700',
    active: 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500',
    inactive: 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed border-gray-200 dark:border-gray-800'
  }
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTabId,
  activeTabId: controlledActiveTabId,
  onChange,
  variant = 'underline',
  fullWidth = false,
  className = ''
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTabId || tabs[0]?.id);
  
  const activeTabId = controlledActiveTabId ?? internalActiveTab;
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleTabClick = (tabId: string) => {
    if (controlledActiveTabId === undefined) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  return (
    <div className={className}>
      <div className={`${variantClasses[variant]} ${fullWidth ? 'flex' : ''}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && handleTabClick(tab.id)}
              className={`
                ${tabVariantClasses[variant].base}
                ${fullWidth ? 'flex-1' : ''}
                ${isDisabled ? tabVariantClasses[variant].disabled : ''}
                ${isActive ? tabVariantClasses[variant].active : tabVariantClasses[variant].inactive}
                flex items-center justify-center gap-2
              `}
              disabled={isDisabled}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {activeTab?.content && (
        <div className="mt-4" role="tabpanel">
          {activeTab.content}
        </div>
      )}
    </div>
  );
};

export interface TabPanelProps {
  children: React.ReactNode;
  activeTabId: string;
  tabId: string;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  activeTabId,
  tabId,
  className = ''
}) => {
  if (activeTabId !== tabId) return null;

  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  );
};