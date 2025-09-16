/**
 * Централизованная валидация для устранения повторяющихся проверок
 */

import { Request } from 'express';
import { logError } from './logger';

// Интерфейсы для валидации
export interface ValidationRule {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'email' | 'url';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
    [key: string]: ValidationRule;
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

/**
 * Валидировать email адрес
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Валидировать URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Валидировать hostname
 */
export function isValidHostname(hostname: string): boolean {
    const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    return hostnameRegex.test(hostname);
}

/**
 * Валидировать отдельное поле
 */
export function validateField(
    fieldName: string, 
    value: any, 
    rule: ValidationRule
): ValidationError | null {
    
    // Проверка обязательности
    if (rule.required && (value === undefined || value === null || value === '')) {
        return {
            field: fieldName,
            message: `${fieldName} is required`,
            value
        };
    }

    // Если поле необязательное и пустое - валидно
    if (!rule.required && (value === undefined || value === null || value === '')) {
        return null;
    }

    // Проверка типа
    if (rule.type) {
        switch (rule.type) {
            case 'string':
                if (typeof value !== 'string') {
                    return { field: fieldName, message: `${fieldName} must be a string`, value };
                }
                break;
            case 'number':
                if (typeof value !== 'number' && isNaN(Number(value))) {
                    return { field: fieldName, message: `${fieldName} must be a number`, value };
                }
                value = Number(value);
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { field: fieldName, message: `${fieldName} must be a boolean`, value };
                }
                break;
            case 'email':
                if (typeof value === 'string' && !isValidEmail(value)) {
                    return { field: fieldName, message: `${fieldName} must be a valid email`, value };
                }
                break;
            case 'url':
                if (typeof value === 'string' && !isValidUrl(value)) {
                    return { field: fieldName, message: `${fieldName} must be a valid URL`, value };
                }
                break;
        }
    }

    // Проверка длины строки
    if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
            return { 
                field: fieldName, 
                message: `${fieldName} must be at least ${rule.minLength} characters`,
                value 
            };
        }
        if (rule.maxLength && value.length > rule.maxLength) {
            return { 
                field: fieldName, 
                message: `${fieldName} must not exceed ${rule.maxLength} characters`,
                value 
            };
        }
    }

    // Проверка числовых диапазонов
    if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
            return { 
                field: fieldName, 
                message: `${fieldName} must be at least ${rule.min}`,
                value 
            };
        }
        if (rule.max !== undefined && value > rule.max) {
            return { 
                field: fieldName, 
                message: `${fieldName} must not exceed ${rule.max}`,
                value 
            };
        }
    }

    // Проверка паттерна
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        return { 
            field: fieldName, 
            message: `${fieldName} format is invalid`,
            value 
        };
    }

    // Кастомная валидация
    if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
            return { 
                field: fieldName, 
                message: typeof result === 'string' ? result : `${fieldName} is invalid`,
                value 
            };
        }
    }

    return null; // Валидация прошла
}

/**
 * Валидировать объект по схеме
 */
export function validateSchema(data: any, schema: ValidationSchema): ValidationError[] {
    const errors: ValidationError[] = [];
    
    Object.entries(schema).forEach(([fieldName, rule]) => {
        const value = data[fieldName];
        const error = validateField(fieldName, value, rule);
        
        if (error) {
            errors.push(error);
        }
    });

    return errors;
}

/**
 * Middleware для валидации тела запроса
 */
export function validateBody(schema: ValidationSchema) {
    return (req: Request, res: any, next: any) => {
        const errors = validateSchema(req.body, schema);
        
        if (errors.length > 0) {
            logError('VALIDATION', `Body validation failed: ${errors.length} errors`);
            return res.status(422).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }
        
        next();
    };
}

/**
 * Middleware для валидации query параметров
 */
export function validateQuery(schema: ValidationSchema) {
    return (req: Request, res: any, next: any) => {
        const errors = validateSchema(req.query, schema);
        
        if (errors.length > 0) {
            logError('VALIDATION', `Query validation failed: ${errors.length} errors`);
            return res.status(422).json({
                success: false,
                error: 'Invalid query parameters',
                details: errors
            });
        }
        
        next();
    };
}

/**
 * Middleware для валидации params
 */
export function validateParams(schema: ValidationSchema) {
    return (req: Request, res: any, next: any) => {
        const errors = validateSchema(req.params, schema);
        
        if (errors.length > 0) {
            logError('VALIDATION', `Params validation failed: ${errors.length} errors`);
            return res.status(422).json({
                success: false,
                error: 'Invalid parameters',
                details: errors
            });
        }
        
        next();
    };
}

// Готовые схемы для частых случаев
export const COMMON_SCHEMAS = {
    LOGIN: {
        email: { required: true, type: 'email' as const },
        password: { required: true, type: 'string' as const, minLength: 1 }
    },
    REGISTER: {
        email: { required: true, type: 'email' as const },
        password: { required: true, type: 'string' as const, minLength: 8 },
        firstName: { required: false, type: 'string' as const, maxLength: 50 },
        lastName: { required: false, type: 'string' as const, maxLength: 50 }
    },
    HOSTNAME: {
        hostname: { 
            required: true, 
            type: 'string' as const,
            custom: (value: string) => isValidHostname(value) || 'Invalid hostname format'
        }
    },
    PAGINATION: {
        page: { required: false, type: 'number' as const, min: 1 },
        limit: { required: false, type: 'number' as const, min: 1, max: 100 },
        search: { required: false, type: 'string' as const, maxLength: 100 }
    }
} as const;
