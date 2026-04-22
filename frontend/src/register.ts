import './public.css';
import { insertHeader, resetHeader } from './layout/public/Header';
import { insertFooter } from './layout/public/Footer';
import { initSimpleFouc } from './utils/simple-fouc';
import { setupPasswordToggle } from './utils/password-toggle';
import { redirectIfAuthenticated } from './utils/auth';
import { initNavigation } from './utils/navigation';
import { initializeAppLanguage, t } from './features/localization';
import { apiRequest, getAuthToken, saveAuthData } from './utils/api-client';
import { ROUTES, API_ENDPOINTS } from './utils/constants';

initializeAppLanguage('titles.register');
redirectIfAuthenticated();

interface PasswordRequirements {
    length: boolean;
    lowercase: boolean;
    number: boolean;
    uppercase: boolean;
}

const token = getAuthToken();

if (token) {
    console.log('Redirecting authenticated user, skipping page initialization');
} else {
    initSimpleFouc();
    initNavigation();
}

function initializePage(): void {
    resetHeader();
    insertHeader();
    insertFooter();
    setupPasswordToggle('password-toggle', 'password');
    setupPasswordToggle('confirm-password-toggle', 'confirmPassword');
    setupPasswordValidation();

    const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistrationFormSubmit);
    }
}

if (!token) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
}

function setupPasswordValidation(): void {
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement | null;

    passwordInput?.addEventListener('input', () => {
        validatePassword(passwordInput.value);
        validatePasswordMatch();
    });
    confirmPasswordInput?.addEventListener('input', () => {
        validatePasswordMatch();
    });
}

function validatePassword(password: string): PasswordRequirements {
    const requirements: PasswordRequirements = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        uppercase: /[A-Z]/.test(password)
    };

    Object.entries(requirements).forEach(([requirement, isValid]) => {
        const element = document.querySelector(`[data-requirement="${requirement}"]`);
        const iconElement = element?.querySelector('.requirement-icon');

        if (!element || !iconElement) {
            return;
        }

        if (isValid) {
            element.classList.add('valid');
            iconElement.textContent = 'OK';
            return;
        }

        element.classList.remove('valid');
        iconElement.textContent = '*';
    });

    return requirements;
}

function validatePasswordMatch(): void {
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement | null;

    if (!passwordInput || !confirmPasswordInput) {
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword && password !== confirmPassword) {
        confirmPasswordInput.setCustomValidity(t('auth.register.validation.passwordMismatch'));
        confirmPasswordInput.style.borderColor = '#dc2626';
        return;
    }

    confirmPasswordInput.setCustomValidity('');
    confirmPasswordInput.style.borderColor = '';
}

function isPasswordValid(password: string): boolean {
    return Object.values(validatePassword(password)).every(Boolean);
}

function showError(message: string): void {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv?.querySelector('.error-text');

    if (!errorDiv || !errorText) {
        return;
    }

    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    window.setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function setLoadingState(loading: boolean): void {
    const button = document.getElementById('register-button') as HTMLButtonElement | null;
    const buttonText = button?.querySelector('.button-text');
    const buttonSpinner = button?.querySelector('.button-spinner') as HTMLElement | null;

    if (!button || !buttonText || !buttonSpinner) {
        return;
    }

    button.disabled = loading;
    buttonText.textContent = loading ? t('auth.register.submitLoading') : t('auth.register.submit');
    buttonSpinner.style.display = loading ? 'flex' : 'none';
}

async function handleRegistrationFormSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const company = formData.get('company') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const terms = formData.get('terms') === 'on';
    const newsletter = formData.get('newsletter') === 'on';
    const errorDiv = document.getElementById('error-message');

    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showError(t('common.messages.requiredFields'));
        return;
    }

    if (!isValidEmail(email)) {
        showError(t('common.messages.invalidEmail'));
        return;
    }

    if (!isPasswordValid(password)) {
        showError(t('auth.register.validation.weakPassword'));
        return;
    }

    if (password !== confirmPassword) {
        showError(t('auth.register.validation.passwordMismatch'));
        return;
    }

    if (!terms) {
        showError(t('auth.register.validation.termsRequired'));
        return;
    }

    setLoadingState(true);

    try {
        const { data, response } = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
            method: 'POST',
            body: JSON.stringify({
                company,
                email,
                firstName,
                lastName,
                newsletter,
                password
            })
        });

        if (response.ok) {
            saveAuthData(data.token, data.user);
            showSuccess(t('auth.register.success'));
            window.setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, 2000);
            return;
        }

        showError(data.message || t('auth.register.validation.failed'));
    } catch (error) {
        console.error('Registration error:', error);
        showError(t('common.messages.networkError'));
    } finally {
        setLoadingState(false);
    }
}

function showSuccess(message: string): void {
    const successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    successDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        color: #166534;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    `;
    successDiv.innerHTML = `
        <div style="flex-shrink: 0;"></div>
        <span>${message}</span>
    `;

    const form = document.getElementById('register-form');
    if (form) {
        form.insertAdjacentElement('afterend', successDiv);
    }
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
