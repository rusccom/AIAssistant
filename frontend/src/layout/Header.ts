// /frontend/src/layout/Header.ts

let headerInserted = false;

// Reset function to force header re-render
export const resetHeader = () => {
    headerInserted = false;
    const existingHeader = document.querySelector('.main-header');
    if (existingHeader) {
        existingHeader.remove();
    }
};

const getUserFromStorage = () => {
    const userString = localStorage.getItem('user');
    if (!userString || userString === 'undefined') {
        return {};
    }
    try {
        return JSON.parse(userString);
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.removeItem('user'); // Clear corrupted data
        return {};
    }
}

const getHeaderTemplate = (): string => {
    const authToken = localStorage.getItem('authToken');
    const user = getUserFromStorage();
    const isLoggedIn = !!authToken;

    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    
    const isLoginPage = window.location.pathname === '/login.html';
    const isRegisterPage = window.location.pathname === '/register.html';
    
    const navLinks = isLoggedIn 
        ? `
            <a href="/dashboard.html" class="nav-link">Dashboard</a>
            <a href="/bot-settings.html" class="nav-link">Bot Settings</a>
            <a href="#" id="logout-button" class="nav-link">Sign Out</a>
        `
        : isHomePage ? `
            <a href="#target-audience" class="nav-link">Made For</a>
            <a href="#voice-bot" class="nav-link">Voice Bot</a>
            <a href="#widget-integration" class="nav-link">Widget</a>
            <a href="#visual-editor" class="nav-link">Editor</a>
            <a href="#statistics" class="nav-link">Analytics</a>
        ` : ``;

    const mobileNavLinks = isLoggedIn 
        ? `
            <a href="/dashboard.html" class="mobile-nav-link">Dashboard</a>
            <a href="/bot-settings.html" class="mobile-nav-link">Bot Settings</a>
            <a href="#" id="mobile-logout-button" class="mobile-nav-link">Sign Out</a>
        `
        : isHomePage ? `
            <a href="#target-audience" class="mobile-nav-link">Made For</a>
            <a href="#voice-bot" class="mobile-nav-link">Voice Bot</a>
            <a href="#widget-integration" class="mobile-nav-link">Widget</a>
            <a href="#visual-editor" class="mobile-nav-link">Editor</a>
            <a href="#statistics" class="mobile-nav-link">Analytics</a>
            <div class="mobile-nav-auth">
                <a href="/login.html" class="header-btn">Sign In</a>
            </div>
        ` : `
            <div class="mobile-nav-auth">
                <a href="/" class="header-btn header-btn-secondary">Home</a>
                ${isLoginPage ? '<a href="/register.html" class="header-btn header-btn-secondary">Register</a>' : '<a href="/login.html" class="header-btn">Sign In</a>'}
            </div>
        `;

    const authButtons = isLoggedIn 
        ? `
            <div class="header-auth">
                <a href="/dashboard.html" class="header-btn header-btn-secondary">Dashboard</a>
                <a href="#" id="logout-button" class="header-btn header-btn-danger">Sign Out</a>
            </div>
        `
        : isLoginPage ? `
            <div class="header-auth">
                <a href="/" class="header-btn header-btn-secondary">Home</a>
                <a href="/register.html" class="header-btn header-btn-secondary">Register</a>
            </div>
        ` : isRegisterPage ? `
            <div class="header-auth">
                <a href="/" class="header-btn header-btn-secondary">Home</a>
                <a href="/login.html" class="header-btn">Sign In</a>
            </div>
        ` : `
            <div class="header-auth">
                <a href="/" class="header-btn header-btn-secondary">Home</a>
                <a href="/login.html" class="header-btn">Sign In</a>
            </div>
        `;

    return `
    <header class="main-header">
        <div class="header-container">
            <a href="/" class="header-logo" aria-label="AIAssistant Home">
                <img src="./logoAi.png" alt="AIAssistant" class="header-logo-image">
            </a>
            ${navLinks ? `<nav id="main-nav" class="header-nav">${navLinks}</nav>` : ''}
            ${authButtons}
            <button id="mobile-menu-toggle" class="mobile-menu-toggle" aria-label="Toggle Menu">
                <div class="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>
        </div>
        <nav id="mobile-nav" class="mobile-nav">
            ${mobileNavLinks}
        </nav>
    </header>
    `;
};

const handleLogout = (e: Event) => {
    e.preventDefault();
    
    // Простой logout - очищаем токен и перенаправляем
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('🔓 Header logout');
    window.location.href = '/login.html';
};

const setupMobileMenuToggle = () => {
    const toggleButton = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');

    if (toggleButton && mobileNav) {
        toggleButton.addEventListener('click', () => {
            mobileNav.classList.toggle('mobile-nav-open');
            toggleButton.classList.toggle('mobile-menu-active');
        });
    }
};

const setActiveHeaderLink = async () => {
    // Используем новую универсальную систему навигации
    const { updateActiveNavigation } = await import('../utils/navigation');
    updateActiveNavigation();
};

export const insertHeader = () => {
    if (headerInserted) {
        // Если хедер уже вставлен, просто обновляем активное состояние
        setActiveHeaderLink();
        return;
    }

    const headerTemplate = getHeaderTemplate();
    const appContainer = document.getElementById('app');
    const mainContainer = document.querySelector('.main-container');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const targetContainer = appContainer || mainContainer || dashboardLayout;

    if (targetContainer) {
        targetContainer.insertAdjacentHTML('afterbegin', headerTemplate);
        headerInserted = true;
        
        const logoutButton = document.getElementById('logout-button');
        const mobileLogoutButton = document.getElementById('mobile-logout-button');
        
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
        
        if (mobileLogoutButton) {
            mobileLogoutButton.addEventListener('click', handleLogout);
        }

        setupMobileMenuToggle();
        setActiveHeaderLink();
    }
};

// Экспортируем функцию для обновления активного состояния (backward compatibility)
export const updateActiveNavigation = () => {
    setActiveHeaderLink();
};
