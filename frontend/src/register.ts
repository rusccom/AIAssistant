import './style.css';
import { insertHeader, resetHeader } from './layout/Header';
import { insertFooter } from './layout/Footer';
import { initSimpleFouc } from './utils/simple-fouc';
import { setupPasswordToggle } from './utils/password-toggle';
import { redirectIfAuthenticated } from './utils/auth';
import { initNavigation } from './utils/navigation';

// Redirect if user is already logged in - stop execution if redirecting  
redirectIfAuthenticated();

interface PasswordRequirements {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
}

// Check if we're redirecting - if so, don't initialize page
const token = localStorage.getItem('authToken');
if (token) {
    // We're being redirected, don't initialize this page
    console.log('🔄 Redirecting authenticated user, skipping page initialization');
} else {
    // Initialize anti-FOUC system immediately
    initSimpleFouc();

    // Initialize navigation highlighting
    initNavigation();
}

function initializePage() {
    resetHeader();
    insertHeader();
    insertFooter();
    
    // Setup password toggles
    setupPasswordToggle('password-toggle', 'password');
    setupPasswordToggle('confirm-password-toggle', 'confirmPassword');
    
    // Setup password validation
    setupPasswordValidation();
    
    // Setup form submission
    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistrationFormSubmit);
    }
}

// Only initialize page if we're not redirecting
if (!token) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
}

function setupPasswordValidation() {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            validatePassword(passwordInput.value);
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            validatePasswordMatch();
        });
    }
}

function validatePassword(password: string): PasswordRequirements {
    const requirements: PasswordRequirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
    };
    
    // Update UI for each requirement
    Object.entries(requirements).forEach(([requirement, isValid]) => {
        const element = document.querySelector(`[data-requirement="${requirement}"]`);
        const iconElement = element?.querySelector('.requirement-icon');
        if (element && iconElement) {
            if (isValid) {
                element.classList.add('valid');
                iconElement.textContent = '✓';
            } else {
                element.classList.remove('valid');
                iconElement.textContent = '•';
            }
        }
    });
    
    return requirements;
}

function validatePasswordMatch() {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    
    if (passwordInput && confirmPasswordInput) {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
            confirmPasswordInput.style.borderColor = '#dc2626';
        } else {
            confirmPasswordInput.setCustomValidity('');
            confirmPasswordInput.style.borderColor = '';
        }
    }
}

function isPasswordValid(password: string): boolean {
    const requirements = validatePassword(password);
    return Object.values(requirements).every(req => req);
}

function showError(message: string) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv?.querySelector('.error-text');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function setLoadingState(loading: boolean) {
    const button = document.getElementById('register-button') as HTMLButtonElement;
    const buttonText = button?.querySelector('.button-text');
    const buttonSpinner = button?.querySelector('.button-spinner') as HTMLElement;
    
    if (button && buttonText && buttonSpinner) {
        button.disabled = loading;
        
        if (loading) {
            buttonText.textContent = 'Creating Account...';
            buttonSpinner.style.display = 'flex';
        } else {
            buttonText.textContent = 'Create Account';
            buttonSpinner.style.display = 'none';
        }
    }
}

async function handleRegistrationFormSubmit(e: Event) {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const company = formData.get('company') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const terms = formData.get('terms') === 'on';
    const newsletter = formData.get('newsletter') === 'on';
    
    // Hide any existing errors
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showError('Please fill in all required fields.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    if (!isPasswordValid(password)) {
        showError('Password does not meet the requirements.');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }
    
    if (!terms) {
        showError('You must agree to the Terms of Service and Privacy Policy.');
        return;
    }
    
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                company,
                password,
                newsletter,
            }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            // Show success and redirect to login
            showSuccess('Account created successfully! Please sign in to continue.');
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            showError(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        setLoadingState(false);
    }
}

function showSuccess(message: string) {
    // Create temporary success message
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
        <div style="flex-shrink: 0;">
            
        </div>
        <span>${message}</span>
    `;
    
    const form = document.getElementById('register-form');
    if (form) {
        form.insertAdjacentElement('afterend', successDiv);
        
        // Initialize icon
    }
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 
