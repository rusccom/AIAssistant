/**
 * Централизованная конфигурация приложения
 */

// Режим работы приложения
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// Сетевые настройки
export const APP_CONFIG = {
    // Порты
    BACKEND_PORT: process.env.PORT || 3000,
    FRONTEND_DEV_PORT: 9001,
    WIDGET_DEV_PORT: 9000,
    
    // URLs
    FRONTEND_DEV_URL: `http://localhost:9001`,
    WIDGET_DEV_URL: `http://localhost:9000`,
    
    // Defaults для разработки
    DEV_ALLOWED_ORIGINS: [
        'http://localhost:9001', 
        'http://localhost:9000'
    ],
    
    // Домены по умолчанию для тестов
    DEFAULT_TEST_HOSTNAME: 'localhost'
} as const;

// JWT настройки
export const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-key',
    EXPIRES_IN: '365d' // Можно сделать настраиваемым через env
} as const;

// Валидация критически важных переменных
if (IS_PRODUCTION && JWT_CONFIG.SECRET === 'your-super-secret-key') {
    console.error('🚨 CRITICAL: JWT_SECRET must be set in production environment');
    process.exit(1);
}

// Database настройки
export const DB_CONFIG = {
    URL: process.env.DATABASE_URL,
    REQUIRED_EXTENSIONS: ['vector'] // для pgvector
} as const;

// OpenAI настройки  
export const OPENAI_CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY
} as const;

// Валидация OpenAI ключа
if (!OPENAI_CONFIG.API_KEY) {
    console.warn('⚠️ WARNING: OPENAI_API_KEY not set - AI functions will not work');
}

// Файловые пути
export const PATHS = {
    RECORDINGS: '../recordings',
    FRONTEND_DIST: '../../frontend/dist',
    WIDGET_PUBLIC: '../public/widget'
} as const;

// Пагинация и лимиты
export const LIMITS = {
    PRODUCTS_PER_PAGE: 50,
    SEARCH_RESULTS_LIMIT: 5,
    MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours
} as const;

// Логирование
export const LOG_CONFIG = {
    ENABLE_DEBUG: IS_DEVELOPMENT,
    ENABLE_VERBOSE_CORS: IS_DEVELOPMENT,
    ENABLE_API_LOGS: IS_DEVELOPMENT
} as const;
