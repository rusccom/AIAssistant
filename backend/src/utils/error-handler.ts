/**
 * Централизованная обработка ошибок Backend
 * Устраняет дубликаты try-catch блоков в controllers
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logError, logWarn } from './logger';
import { sendError, sendInternalError, sendBadRequest, sendNotFound, sendConflict } from './response';
import { IS_PRODUCTION } from '../config/app-config';

// Типы ошибок приложения
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = 'AppError';
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// Конкретные типы ошибок
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Обработать Prisma ошибки
 */
export function handlePrismaError(error: any): AppError {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const field = error.meta?.target || 'field';
                return new AppError(`${field} already exists`, 409);
                
            case 'P2025':
                // Record not found
                return new NotFoundError('Record not found');
                
            case 'P2003':
                // Foreign key constraint
                return new ValidationError('Invalid reference');
                
            case 'P2022':
                // Column not found (schema mismatch)
                logError('PRISMA', `Schema mismatch: ${error.message}`);
                return new AppError('Database schema error', 500);
                
            default:
                logError('PRISMA', `Unknown Prisma error (${error.code}): ${error.message}`);
                return new AppError('Database error', 500);
        }
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
        logError('PRISMA', `Validation error: ${error.message}`);
        return new ValidationError('Invalid data format');
    }
    
    logError('PRISMA', `Unexpected Prisma error: ${error.message}`);
    return new AppError('Database error', 500);
}

/**
 * Центральный error handler middleware
 */
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
    let appError: AppError;

    // Обработка разных типов ошибок
    if (error instanceof AppError) {
        appError = error;
    } else if (error.code?.startsWith('P')) {
        // Prisma ошибки
        appError = handlePrismaError(error);
    } else if (error.name === 'ValidationError') {
        appError = new ValidationError(error.message);
    } else if (error.name === 'CastError') {
        appError = new ValidationError('Invalid ID format');
    } else {
        // Неожиданные ошибки
        appError = new AppError(
            IS_PRODUCTION ? 'Internal Server Error' : error.message, 
            500,
            false
        );
    }

    // Логируем ошибку
    const errorContext = {
        method: req.method,
        url: req.originalUrl,
        userId: (req as any).user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    };

    if (appError.isOperational) {
        logWarn('ERROR_HANDLER', `Operational error: ${appError.message}`, errorContext);
    } else {
        logError('ERROR_HANDLER', `System error: ${appError.message}`, { error, context: errorContext });
    }

    // Отправляем ответ клиенту
    sendError(res, appError.message, appError.statusCode);
}

/**
 * Wrapper для async functions с автоматической обработкой ошибок
 */
export function catchAsync(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 handler для неизвестных routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}

/**
 * Проверить права доступа к домену
 */
export function validateDomainAccess(userId: number, domainUserId: number): void {
    if (userId !== domainUserId) {
        throw new AuthorizationError('Access denied to this domain');
    }
}

/**
 * Проверить обязательные поля
 */
export function requireFields(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
        throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
}

/**
 * Безопасное parseInt с валидацией
 */
export function safeParseInt(value: any, fieldName: string, min?: number, max?: number): number {
    const parsed = parseInt(value);
    
    if (isNaN(parsed)) {
        throw new ValidationError(`${fieldName} must be a valid number`);
    }
    
    if (min !== undefined && parsed < min) {
        throw new ValidationError(`${fieldName} must be at least ${min}`);
    }
    
    if (max !== undefined && parsed > max) {
        throw new ValidationError(`${fieldName} must not exceed ${max}`);
    }
    
    return parsed;
}
