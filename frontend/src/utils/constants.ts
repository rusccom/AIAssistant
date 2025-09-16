/**
 * Централизованные константы Frontend
 * Устраняет хардкод в 31 месте использования URLs
 */

// Маршруты приложения
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login.html',
    REGISTER: '/register.html', 
    DASHBOARD: '/dashboard.html',
    BOT_SETTINGS: '/bot-settings.html',
    VISUAL_EDITOR: '/visual-editor.html'
} as const;

// UI настройки
export const UI_CONFIG = {
    PAGINATION: {
        ITEMS_PER_PAGE: 50,
        MAX_VISIBLE_PAGES: 5
    },
    TIMEOUTS: {
        REDIRECT_DELAY: 2000,
        AUTO_SAVE_DELAY: 1000,
        DEBOUNCE_DELAY: 300
    },
    LIMITS: {
        PASSWORD_MIN_LENGTH: 8,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_TEXTAREA_LENGTH: 2000
    }
} as const;

// Текстовые сообщения (для локализации)
export const MESSAGES = {
    AUTH: {
        LOGIN_SUCCESS: 'Login successful!',
        LOGOUT_SUCCESS: 'Logged out successfully',
        INVALID_CREDENTIALS: 'Invalid email or password',
        TOKEN_EXPIRED: 'Session expired. Please login again.',
        REGISTRATION_SUCCESS: 'Account created successfully! Please sign in to continue.'
    },
    VALIDATION: {
        REQUIRED_FIELDS: 'Please fill in all required fields.',
        INVALID_EMAIL: 'Please enter a valid email address.',
        PASSWORD_MISMATCH: 'Passwords do not match.',
        WEAK_PASSWORD: 'Password does not meet the requirements.',
        TERMS_REQUIRED: 'You must agree to the Terms of Service and Privacy Policy.'
    },
    ERRORS: {
        NETWORK_ERROR: 'Network error. Please check your connection and try again.',
        SERVER_ERROR: 'Server error. Please try again later.',
        UNAUTHORIZED: 'You are not authorized to access this resource.',
        NOT_FOUND: 'Requested resource not found.'
    },
    SUCCESS: {
        DATA_SAVED: 'Data saved successfully!',
        DATA_DELETED: 'Data deleted successfully!',
        EMAIL_SENT: 'Email sent successfully!'
    }
} as const;

// Селекторы DOM элементов  
export const SELECTORS = {
    ERROR_MESSAGE: '#error-message',
    SUCCESS_MESSAGE: '#success-message',
    LOADING_SPINNER: '.loading-spinner',
    MODAL: '.modal',
    FORM: 'form',
    SUBMIT_BTN: '[type="submit"]'
} as const;

// CSS классы
export const CSS_CLASSES = {
    HIDDEN: 'hidden',
    LOADING: 'loading', 
    ERROR: 'error',
    SUCCESS: 'success',
    ACTIVE: 'active',
    DISABLED: 'disabled'
} as const;

// Локальное хранилище ключи
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_DATA: 'user',
    SETTINGS: 'settings',
    PREFERENCES: 'preferences'
} as const;

// API Endpoints (перенесено из api-client.ts для избежания циклических импортов)
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register', 
        ME: '/api/auth/me',
        CHANGE_PASSWORD: '/api/auth/change-password',
        LOGOUT: '/api/auth/logout'
    },
    DASHBOARD: {
        DATA: '/api/dashboard/data',
        SESSIONS: '/api/dashboard/sessions'
    },
    BOT_CONFIG: {
        BASE: '/api/bot-config',
        DOMAINS: '/api/bot-config/domains'
    },
    PRODUCTS: {
        BASE: '/api/products'
    },
    SESSIONS: {
        EXPORT: '/api/sessions'
    }
} as const;
