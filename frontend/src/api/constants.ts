// API base paths
export const API_PATHS = {
  STUDENTS: '/students',
  PROFILE: '/profile',
  GROUPS: '/groups',
  CHAT: '/chat',
  TEAMS: '/teams',
  REQUESTS: '/requests',
  REPOS: '/repos',
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// API Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Request status types
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

// Chat status types
export const CHAT_STATUS = {
  CONNECTED: 'connected',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  NO_CONNECTION: 'no_connection',
} as const;

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LINK: 'link',
} as const;

// Group roles
export const GROUP_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
  CREATOR: 'creator',
} as const;

// Mention types
export const MENTION_TYPES = {
  USER: 'user',
  HERE: 'here',
  ALL: 'all',
  NONE: 'none',
} as const;

// Connection status
export const CONNECTION_STATUS = {
  NO_CONNECTION: 'no_connection',
  YOU_SENT_PENDING: 'you_sent_pending',
  YOU_SENT_ACCEPTED: 'you_sent_accepted',
  YOU_SENT_REJECTED: 'you_sent_rejected',
  THEY_SENT_PENDING: 'they_sent_pending',
  THEY_SENT_ACCEPTED: 'they_sent_accepted',
  THEY_SENT_REJECTED: 'they_sent_rejected',
} as const;

// Default pagination values
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Chat events
  CHAT_MESSAGE: 'chat',
  FILE_MESSAGE: 'file',
  TYPING: 'typing',
  READ: 'read',
  MESSAGE_SENT: 'message_sent',
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',
  MESSAGES_READ: 'messages_read',
  MESSAGE_EDITED: 'message_edited',

  // Group events
  GROUP_JOIN: 'join_group',
  GROUP_LEAVE: 'leave_group',
  GROUP_MESSAGE: 'group_message',
  GROUP_TYPING: 'group_typing',
  GROUP_READ: 'group_read',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  GROUP_UPDATED: 'group_updated',
  GROUP_DELETED: 'group_deleted',

  // Poll events
  POLL_CREATED: 'poll_created',
  POLL_VOTE: 'poll_vote',

  // System events
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  DEFAULT: 50 * 1024 * 1024, // 50MB
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
} as const;

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// API endpoints with parameters
export const API_ENDPOINTS = {
  // Students
  STUDENTS: '/students',
  STUDENT_BY_ID: (id: string) => `/students/${id}`,
  STUDENTS_BY_SKILL: (skill: string) => `/students/skill/${skill}`,
  STUDENT_GITHUB_PROFILE: (username: string) => `/students/profile/${username}`,

  // Profile
  MY_PROFILE: '/profile/me',
  PROFILE_BY_ID: (id: string) => `/profile/${id}`,
  PROFILE_BY_GITHUB: (username: string) => `/profile/by-github/${username}`,

  // Groups
  GROUPS: '/groups',
  MY_GROUPS: '/groups/my-groups',
  GROUP_BY_ID: (id: string) => `/groups/${id}`,
  GROUP_MEMBERS: (id: string) => `/groups/${id}/members`,
  GROUP_MESSAGES: (id: string) => `/groups/${id}/messages`,
  GROUP_INVITES: (id: string) => `/groups/${id}/invites`,
  GROUP_PINS: (id: string) => `/groups/${id}/pins`,
  GROUP_STATS: (id: string) => `/groups/${id}/stats`,
  GROUP_ONLINE: (id: string) => `/groups/${id}/online`,
  JOIN_GROUP: (code: string) => `/groups/join/${code}`,

  // Chat
  CHAT_MESSAGE: '/chat/message',
  CHAT_UPLOAD: '/chat/upload',
  CHAT_SEND_FILE: '/chat/send-file',
  CHAT_CONVERSATION: (userId: string) => `/chat/conversation/${userId}`,
  CHAT_MARK_READ: (userId: string) => `/chat/mark-read/${userId}`,
  CHAT_MESSAGE_READ: (messageId: string) => `/chat/mark-message-read/${messageId}`,
  CHAT_CAN_CHAT: (userId: string) => `/chat/can-chat/${userId}`,
  CHAT_DOWNLOAD: (messageId: string) => `/chat/download/${messageId}`,

  // Teams
  TEAMS_OPTIMIZE: '/teams/build/optimize',
  TEAMS_BUILD_AROUND: (studentId: string) => `/teams/build/${studentId}`,
  TEAMS_VALIDATE: '/teams/validate',

  // Requests
  REQUESTS: '/requests',
  SENT_REQUESTS: '/requests/sent',
  RECEIVED_REQUESTS: '/requests/received',
  REQUEST_BY_ID: (id: string) => `/requests/${id}`,
  CONNECTIONS: '/requests/connections',
  CHECK_CONNECTION: (userId: string) => `/requests/check/${userId}`,

  // Repos
  USER_REPOS: (username: string) => `/repos/${username}`,
  USER_TOP_REPOS: (username: string) => `/repos/${username}/top`,
} as const;