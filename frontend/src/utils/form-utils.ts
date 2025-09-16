/**
 * Утилиты для работы с формами
 * Устраняет дубликаты валидации в register.ts, login.ts
 */

import { MESSAGES, CSS_CLASSES } from './constants';
import { showError, showSuccess } from './error-handler';

// Типы валидации
export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => boolean | string;
}

export interface FormField {
    name: string;
    element: HTMLInputElement | HTMLTextAreaElement;
    rules?: ValidationRule;
    errorMessage?: string;
}

/**
 * Валидация email адреса
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Валидация пароля по требованиям
 */
export function validatePassword(password: string): {
    isValid: boolean;
    requirements: {
        length: boolean;
        uppercase: boolean;
        lowercase: boolean;
        number: boolean;
    }
} {
    return {
        isValid: password.length >= 8 && 
                /[A-Z]/.test(password) && 
                /[a-z]/.test(password) && 
                /\d/.test(password),
        requirements: {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password)
        }
    };
}

/**
 * Валидация отдельного поля формы
 */
export function validateField(field: FormField): boolean {
    const { element, rules, errorMessage } = field;
    const value = element.value.trim();
    
    // Очистить предыдущие ошибки
    element.classList.remove(CSS_CLASSES.ERROR);
    
    if (!rules) return true;
    
    // Проверка обязательности
    if (rules.required && !value) {
        markFieldError(element, errorMessage || MESSAGES.VALIDATION.REQUIRED_FIELDS);
        return false;
    }
    
    // Проверка минимальной длины
    if (rules.minLength && value.length < rules.minLength) {
        markFieldError(element, `Minimum ${rules.minLength} characters required`);
        return false;
    }
    
    // Проверка максимальной длины  
    if (rules.maxLength && value.length > rules.maxLength) {
        markFieldError(element, `Maximum ${rules.maxLength} characters allowed`);
        return false;
    }
    
    // Проверка паттерна
    if (rules.pattern && !rules.pattern.test(value)) {
        markFieldError(element, errorMessage || 'Invalid format');
        return false;
    }
    
    // Кастомная валидация
    if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
            const message = typeof customResult === 'string' ? customResult : 'Invalid value';
            markFieldError(element, message);
            return false;
        }
    }
    
    return true;
}

/**
 * Отметить поле как невалидное
 */
function markFieldError(element: HTMLElement, message: string): void {
    element.classList.add(CSS_CLASSES.ERROR);
    showError(message);
}

/**
 * Валидация всей формы
 */
export function validateForm(form: HTMLFormElement, fields: FormField[]): boolean {
    let isValid = true;
    
    for (const field of fields) {
        if (!validateField(field)) {
            isValid = false;
            break; // Останавливаемся на первой ошибке
        }
    }
    
    return isValid;
}

/**
 * Получить данные формы как объект
 */
export function getFormData(form: HTMLFormElement): Record<string, any> {
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
        if (value === 'on') {
            data[key] = true; // Checkbox
        } else {
            data[key] = value.toString().trim();
        }
    }
    
    return data;
}

/**
 * Установить состояние загрузки для формы
 */
export function setFormLoading(form: HTMLFormElement, loading: boolean): void {
    const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement;
    const inputs = form.querySelectorAll('input, select, textarea');
    
    if (loading) {
        // Блокировать форму
        inputs.forEach(input => (input as HTMLInputElement).disabled = true);
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add(CSS_CLASSES.LOADING);
            
            // Показать спиннер если есть
            const spinner = submitBtn.querySelector('.spinner') as HTMLElement;
            if (spinner) spinner.style.display = 'inline-block';
        }
    } else {
        // Разблокировать форму
        inputs.forEach(input => (input as HTMLInputElement).disabled = false);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove(CSS_CLASSES.LOADING);
            
            // Скрыть спиннер
            const spinner = submitBtn.querySelector('.spinner') as HTMLElement;
            if (spinner) spinner.style.display = 'none';
        }
    }
}

/**
 * Очистить форму и ошибки
 */
export function resetForm(form: HTMLFormElement): void {
    form.reset();
    
    // Убрать все маркеры ошибок
    const errorFields = form.querySelectorAll(`.${CSS_CLASSES.ERROR}`);
    errorFields.forEach(field => field.classList.remove(CSS_CLASSES.ERROR));
    
    // Скрыть сообщения об ошибках
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(msg => (msg as HTMLElement).style.display = 'none');
}

/**
 * Автосохранение данных формы (для длинных форм)
 */
export function setupAutoSave(
    form: HTMLFormElement,
    key: string,
    delay: number = 1000
): () => void {
    let timeoutId: number;
    
    const saveData = () => {
        const data = getFormData(form);
        localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
        console.log(`📁 Form auto-saved: ${key}`);
    };
    
    const handleInput = () => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(saveData, delay);
    };
    
    // Подписаться на изменения
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.addEventListener('input', handleInput));
    
    // Возвращаем функцию очистки
    return () => {
        clearTimeout(timeoutId);
        inputs.forEach(input => input.removeEventListener('input', handleInput));
        localStorage.removeItem(`autosave_${key}`);
    };
}

/**
 * Восстановить данные формы из автосохранения
 */
export function restoreFormData(form: HTMLFormElement, key: string): boolean {
    try {
        const saved = localStorage.getItem(`autosave_${key}`);
        if (!saved) return false;
        
        const data = JSON.parse(saved);
        
        Object.entries(data).forEach(([fieldName, value]) => {
            const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
            if (field && value !== null && value !== undefined) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else {
                    field.value = String(value);
                }
            }
        });
        
        console.log(`📂 Form data restored: ${key}`);
        return true;
    } catch (error) {
        console.warn(`Failed to restore form data for ${key}:`, error);
        return false;
    }
}
