import './style.css';
import { insertHeader, resetHeader } from './layout/Header';
import { insertFooter } from './layout/Footer';
import { initSimpleFouc } from './utils/simple-fouc';
import { setupPasswordToggle } from './utils/password-toggle';
import { redirectIfAuthenticated } from './utils/auth';
import { initNavigation } from './utils/navigation';

// Redirect if user is already logged in
redirectIfAuthenticated();

// Initialize anti-FOUC system immediately
initSimpleFouc();

// Initialize navigation highlighting
initNavigation();

const initializePage = () => {
    resetHeader();
    insertHeader();
    insertFooter();
    
    // Setup password toggle
    setupPasswordToggle('password-toggle', 'password');

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLoginFormSubmit);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

async function handleLoginFormSubmit(event: Event) {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    
    const errorDiv = document.getElementById('error-message');
    if(errorDiv) errorDiv.style.display = 'none';

    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Сохраняем токен и пользователя (токен автоматически на год)
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('✅ Логин успешен, токен сохранен на год');
            window.location.href = '/dashboard.html';
        } else {
            showError(data.message || 'Login failed.');
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
    }
}

function showError(message: string) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv?.querySelector('.error-text');

    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
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
    
    const form = document.getElementById('login-form');
    if (form) {
        form.insertAdjacentElement('afterend', successDiv);
        
        // Initialize icon
    }
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 
