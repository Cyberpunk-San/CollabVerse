// Shared/common types used across multiple modules

// User status
export interface UserStatus {
  user_id: string;
  online: boolean;
  last_seen?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

// Date range
export interface DateRange {
  from?: string;
  to?: string;
}

// Sort options
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// File info
export interface FileInfo {
  url: string;
  name: string;
  size: number;
  mime_type: string;
  thumbnail_url?: string | null;
}

// Notification
export interface Notification {
  id: string;
  type: 'request' | 'mention' | 'message' | 'group_invite' | 'team_update';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

// Menu item
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  children?: MenuItem[];
}

// Theme
export interface Theme {
  mode: 'light' | 'dark';
  primary_color: string;
  secondary_color: string;
  font_size: 'small' | 'medium' | 'large';
}

// Dropdown option
export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Tab item
export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  disabled?: boolean;
}

// Breadcrumb
export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

// Modal props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnClickOutside?: boolean;
  closeOnEsc?: boolean;
}