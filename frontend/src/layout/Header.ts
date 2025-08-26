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

    const navLinks = isLoggedIn 
        ? `
            <a href="/dashboard.html" class="nav-link">Dashboard</a>
            <a href="/bot-settings.html" class="nav-link">Bot Settings</a>
            <a href="#" id="logout-button" class="nav-link">Sign Out</a>
        `
        : `
            <a href="/" class="nav-link">Home</a>
            <a href="/about.html" class="nav-link">About</a>
            <a href="/contacts.html" class="nav-link">Contact</a>
            <a href="/login.html" class="btn btn-primary-sm">Sign In</a>
        `;

    const mobileNavLinks = isLoggedIn 
        ? `
            <a href="/dashboard.html" class="mobile-nav-link">Dashboard</a>
            <a href="/bot-settings.html" class="mobile-nav-link">Bot Settings</a>
            <a href="#" id="mobile-logout-button" class="mobile-nav-link">Sign Out</a>
        `
        : `
            <a href="/" class="mobile-nav-link">Home</a>
            <a href="/about.html" class="mobile-nav-link">About</a>
            <a href="/contacts.html" class="mobile-nav-link">Contact</a>
            <div class="mobile-nav-auth">
                <a href="/login.html" class="header-btn">Sign In</a>
            </div>
        `;

    return `
    <header class="main-header">
        <div class="header-container">
            <a href="/" class="header-logo" aria-label="AIAssistant Home">
                <div class="logo-icon">
                    <i>🤖</i>
                </div>
                <span class="logo-text">AIAssistant</span>
            </a>
            <nav id="main-nav" class="header-nav">
                ${navLinks}
            </nav>
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
