/**
 * Централизованное логирование для устранения дубликатов console.log
 * Заменяет разбросанные console.log/error/warn по всем файлам
 */

import { IS_DEVELOPMENT, IS_PRODUCTION, LOG_CONFIG } from '../config/app-config';

// Уровни логирования
export enum LogLevel {
    ERROR = 0,
    WARN = 1, 
    INFO = 2,
    DEBUG = 3
}

// Цвета для консоли
const COLORS = {
    ERROR: '\x1b[31m',   // Red
    WARN: '\x1b[33m',    // Yellow  
    INFO: '\x1b[36m',    // Cyan
    DEBUG: '\x1b[35m',   // Magenta
    SUCCESS: '\x1b[32m', // Green
    RESET: '\x1b[0m'
} as const;

// Эмодзи для разных типов логов
const EMOJIS = {
    ERROR: '❌',
    WARN: '⚠️',
    INFO: 'ℹ️', 
    DEBUG: '🔧',
    SUCCESS: '✅',
    API: '🌐',
    DB: '🗄️',
    AUTH: '🔐',
    WEBSOCKET: '🔄'
} as const;

export class Logger {
    private static instance: Logger;
    private minLevel: LogLevel;

    private constructor() {
        this.minLevel = IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG;
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Форматированный вывод лога
     */
    private log(level: LogLevel, category: string, message: string, data?: any): void {
        if (level > this.minLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const color = COLORS[levelName as keyof typeof COLORS];
        const emoji = EMOJIS[category as keyof typeof EMOJIS] || EMOJIS.INFO;
        
        const formattedMessage = `${color}${emoji} [${levelName}] ${timestamp} [${category}] ${message}${COLORS.RESET}`;
        
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage, data || '');
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, data || '');
                break;
            default:
                console.log(formattedMessage, data || '');
        }
    }

    // Методы логирования по категориям
    public error(category: string, message: string, error?: any): void {
        this.log(LogLevel.ERROR, category, message, error);
    }

    public warn(category: string, message: string, data?: any): void {
        this.log(LogLevel.WARN, category, message, data);
    }

    public info(category: string, message: string, data?: any): void {
        this.log(LogLevel.INFO, category, message, data);
    }

    public debug(category: string, message: string, data?: any): void {
        if (LOG_CONFIG.ENABLE_DEBUG) {
            this.log(LogLevel.DEBUG, category, message, data);
        }
    }

    public success(category: string, message: string, data?: any): void {
        this.log(LogLevel.INFO, category, `✅ ${message}`, data);
    }

    // Специализированные методы для частых случаев
    public api(message: string, data?: any): void {
        this.info('API', message, data);
    }

    public db(message: string, data?: any): void {
        this.info('DB', message, data);
    }

    public auth(message: string, data?: any): void {
        this.info('AUTH', message, data);
    }

    public websocket(message: string, data?: any): void {
        this.info('WEBSOCKET', message, data);
    }

    public cors(message: string, data?: any): void {
        if (LOG_CONFIG.ENABLE_VERBOSE_CORS) {
            this.info('CORS', message, data);
        }
    }

    /**
     * Логирование производительности
     */
    public performance(category: string, operation: string, startTime: number): void {
        const duration = Date.now() - startTime;
        this.info(category, `${operation} completed in ${duration}ms`);
    }

    /**
     * Логирование с контекстом запроса
     */
    public request(method: string, path: string, userId?: number, duration?: number): void {
        const user = userId ? ` [User:${userId}]` : '';
        const time = duration ? ` (${duration}ms)` : '';
        this.api(`${method} ${path}${user}${time}`);
    }
}

// Синглтон инстанс
const logger = Logger.getInstance();

// Экспорт готовых функций для удобства
export const logError = (category: string, message: string, error?: any) => logger.error(category, message, error);
export const logWarn = (category: string, message: string, data?: any) => logger.warn(category, message, data);
export const logInfo = (category: string, message: string, data?: any) => logger.info(category, message, data);
export const logDebug = (category: string, message: string, data?: any) => logger.debug(category, message, data);
export const logSuccess = (category: string, message: string, data?: any) => logger.success(category, message, data);

// Специализированные логгеры
export const logApi = (message: string, data?: any) => logger.api(message, data);
export const logDb = (message: string, data?: any) => logger.db(message, data);
export const logAuth = (message: string, data?: any) => logger.auth(message, data);
export const logWebSocket = (message: string, data?: any) => logger.websocket(message, data);
export const logCors = (message: string, data?: any) => logger.cors(message, data);
export const logPerformance = (category: string, operation: string, startTime: number) => 
    logger.performance(category, operation, startTime);
export const logRequest = (method: string, path: string, userId?: number, duration?: number) => 
    logger.request(method, path, userId, duration);

export { logger };
