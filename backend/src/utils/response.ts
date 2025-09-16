/**
 * Стандартизированные HTTP ответы
 * Устраняет дубликаты res.json/res.status в controllers
 */

import { Response } from 'express';
import { logApi, logError } from './logger';
import { IS_PRODUCTION } from '../config/app-config';

// Стандартные интерфейсы ответов
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: PaginationMeta;
    details?: ErrorDetail[];
}

export interface PaginationMeta {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ErrorDetail {
    field?: string;
    code?: string;
    message: string;
}

/**
 * Успешный ответ с данными
 */
export function sendSuccess<T>(
    res: Response, 
    data: T, 
    message?: string,
    statusCode: number = 200
): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message
    };
    
    res.status(statusCode).json(response);
    logApi(`Response sent: ${statusCode} ${message || 'Success'}`);
}

/**
 * Успешный ответ с пагинацией
 */
export function sendPaginatedSuccess<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
): void {
    const response: ApiResponse<T[]> = {
        success: true,
        data,
        pagination,
        message
    };
    
    res.status(200).json(response);
    logApi(`Paginated response: ${data.length} items, page ${pagination.page}/${pagination.totalPages}`);
}

/**
 * Ответ с ошибкой
 */
export function sendError(
    res: Response,
    message: string,
    statusCode: number = 400,
    details?: ErrorDetail[]
): void {
    const response: ApiResponse = {
        success: false,
        error: message,
        ...(details && { details })
    };
    
    res.status(statusCode).json(response);
    logError('API', `Error response: ${statusCode} - ${message}`);
}

/**
 * Ответ 400 Bad Request
 */
export function sendBadRequest(res: Response, message: string = 'Bad Request'): void {
    sendError(res, message, 400);
}

/**
 * Ответ 401 Unauthorized
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    sendError(res, message, 401);
}

/**
 * Ответ 403 Forbidden
 */
export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
    sendError(res, message, 403);
}

/**
 * Ответ 404 Not Found
 */
export function sendNotFound(res: Response, message: string = 'Not Found'): void {
    sendError(res, message, 404);
}

/**
 * Ответ 409 Conflict
 */
export function sendConflict(res: Response, message: string = 'Conflict'): void {
    sendError(res, message, 409);
}

/**
 * Ответ 500 Internal Server Error
 */
export function sendInternalError(res: Response, message: string = 'Internal Server Error'): void {
    sendError(res, message, 500);
}

/**
 * Валидационные ошибки (422 Unprocessable Entity)
 */
export function sendValidationError(
    res: Response, 
    errors: ErrorDetail[], 
    message: string = 'Validation failed'
): void {
    const response: ApiResponse = {
        success: false,
        error: message,
        details: errors
    };
    
    res.status(422).json(response);
    logError('VALIDATION', `Validation errors: ${errors.length} fields`);
}

/**
 * Создать объект пагинации
 */
export function createPaginationMeta(
    page: number,
    limit: number,
    totalCount: number
): PaginationMeta {
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

/**
 * Wrapper для async route handlers с автоматической обработкой ошибок
 */
export function asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logError('ASYNC_HANDLER', 'Unhandled async error:', error);
            
            if (res.headersSent) {
                return next(error);
            }
            
            sendInternalError(res, IS_PRODUCTION ? 'Internal Server Error' : error.message);
        });
    };
}

/**
 * Middleware для логирования всех запросов
 */
export function requestLogger(req: any, res: any, next: any) {
    const start = Date.now();
    const { method, originalUrl } = req;
    const userId = req.user?.id;
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logApi(`${method} ${originalUrl} ${res.statusCode}${userId ? ` [User:${userId}]` : ''} (${duration}ms)`);
    });
    
    next();
}
