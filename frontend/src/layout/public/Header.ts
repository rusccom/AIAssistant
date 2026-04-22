import { ROUTES } from '../../utils/constants';
import { refreshLocalizedUi } from '../../features/localization';

let headerInserted = false;

type PageFlags = {
    isHomePage: boolean;
    isLoginPage: boolean;
    isRegisterPage: boolean;
};

export const resetHeader = () => {
    headerInserted = false;
    document.querySelector('.main-header')?.remove();
};

function getPageFlags(): PageFlags {
    const currentPath = window.location.pathname;
    return {
        isHomePage: currentPath === ROUTES.HOME || currentPath === '/index.html',
        isLoginPage: currentPath === ROUTES.LOGIN,
        isRegisterPage: currentPath === ROUTES.REGISTER,
    };
}

function getNavLinks(flags: PageFlags): string {
    if (!flags.isHomePage) {
        return '';
    }

    return `
        <a href="#target-audience" class="nav-link" data-i18n="public.nav.madeFor">Made For</a>
        <a href="#voice-bot" class="nav-link" data-i18n="public.nav.voiceBot">Voice Bot</a>
        <a href="#widget-integration" class="nav-link" data-i18n="public.nav.widget">Widget</a>
        <a href="#visual-editor" class="nav-link" data-i18n="public.nav.editor">Editor</a>
        <a href="#statistics" class="nav-link" data-i18n="public.nav.analytics">Analytics</a>
    `;
}

function getDesktopActions(flags: PageFlags): string {
    if (flags.isLoginPage) {
        return `
            <div class="header-auth">
                <a href="${ROUTES.HOME}" class="header-btn header-btn-secondary" data-i18n="common.buttons.home">Home</a>
                <a href="${ROUTES.REGISTER}" class="header-btn header-btn-secondary" data-i18n="common.buttons.register">Register</a>
            </div>
        `;
    }

    if (flags.isRegisterPage) {
        return `
            <div class="header-auth">
                <a href="${ROUTES.HOME}" class="header-btn header-btn-secondary" data-i18n="common.buttons.home">Home</a>
                <a href="${ROUTES.LOGIN}" class="header-btn" data-i18n="common.buttons.signIn">Sign In</a>
            </div>
        `;
    }

    return `
        <div class="header-auth">
            <a href="${ROUTES.HOME}" class="header-btn header-btn-secondary" data-i18n="common.buttons.home">Home</a>
            <a href="${ROUTES.LOGIN}" class="header-btn" data-i18n="common.buttons.signIn">Sign In</a>
        </div>
    `;
}

function getMobileNavLinks(flags: PageFlags): string {
    if (flags.isHomePage) {
        return `
            <a href="#target-audience" class="mobile-nav-link" data-i18n="public.nav.madeFor">Made For</a>
            <a href="#voice-bot" class="mobile-nav-link" data-i18n="public.nav.voiceBot">Voice Bot</a>
            <a href="#widget-integration" class="mobile-nav-link" data-i18n="public.nav.widget">Widget</a>
            <a href="#visual-editor" class="mobile-nav-link" data-i18n="public.nav.editor">Editor</a>
            <a href="#statistics" class="mobile-nav-link" data-i18n="public.nav.analytics">Analytics</a>
            <div class="mobile-nav-auth">
                <a href="${ROUTES.LOGIN}" class="header-btn" data-i18n="common.buttons.signIn">Sign In</a>
            </div>
        `;
    }

    const secondaryAction = flags.isLoginPage
        ? `<a href="${ROUTES.REGISTER}" class="header-btn header-btn-secondary" data-i18n="common.buttons.register">Register</a>`
        : `<a href="${ROUTES.LOGIN}" class="header-btn" data-i18n="common.buttons.signIn">Sign In</a>`;

    return `
        <div class="mobile-nav-auth">
            <a href="${ROUTES.HOME}" class="header-btn header-btn-secondary" data-i18n="common.buttons.home">Home</a>
            ${secondaryAction}
        </div>
    `;
}

function getHeaderTemplate(): string {
    const flags = getPageFlags();
    const navLinks = getNavLinks(flags);

    return `
        <header class="main-header">
            <div class="header-container">
                <a
                    href="${ROUTES.HOME}"
                    class="header-logo"
                    aria-label="AIAssistant home"
                    data-i18n-aria-label="public.logo.aria"
                >
                    <img src="./logoAi.png" alt="AIAssistant" class="header-logo-image">
                </a>
                ${navLinks ? `<nav id="main-nav" class="header-nav">${navLinks}</nav>` : ''}
                ${getDesktopActions(flags)}
                <button
                    id="mobile-menu-toggle"
                    class="mobile-menu-toggle"
                    aria-label="Toggle menu"
                    data-i18n-aria-label="common.menu.toggle"
                >
                    <div class="hamburger">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
            </div>
            <nav id="mobile-nav" class="mobile-nav">
                ${getMobileNavLinks(flags)}
            </nav>
        </header>
    `;
}

function setupMobileMenuToggle(): void {
    const toggleButton = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');

    if (!toggleButton || !mobileNav) {
        return;
    }

    toggleButton.addEventListener('click', () => {
        mobileNav.classList.toggle('mobile-nav-open');
        toggleButton.classList.toggle('mobile-menu-active');
    });
}

async function setActiveHeaderLink(): Promise<void> {
    const { updateActiveNavigation } = await import('../../utils/navigation');
    updateActiveNavigation();
}

export const insertHeader = () => {
    if (headerInserted) {
        void setActiveHeaderLink();
        return;
    }

    const appContainer = document.getElementById('app');
    if (!appContainer) {
        return;
    }

    appContainer.insertAdjacentHTML('afterbegin', getHeaderTemplate());
    headerInserted = true;
    refreshLocalizedUi(appContainer);
    setupMobileMenuToggle();
    void setActiveHeaderLink();
};

export const updateActiveNavigation = () => {
    void setActiveHeaderLink();
};
