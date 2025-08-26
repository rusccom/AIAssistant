/**
 * System default values for fields that are not set from frontend
 * These values are managed automatically by the system
 */
export const SYSTEM_DEFAULTS = {
  conversationStates: [],
  editorSettings: {}
} as const;

export type SystemDefaults = typeof SYSTEM_DEFAULTS; 