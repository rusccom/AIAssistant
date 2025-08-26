/**
 * Утилиты для управления навигацией и подсветкой активных пунктов меню
 */

/**
 * Обновляет активное состояние для всех типов навигации (header, sidebar, mobile)
 */
export function updateActiveNavigation(): void {
    const currentPath = window.location.pathname;
    
    // Обновляем header навигацию (desktop)
    updateHeaderNavigation(currentPath);
    
    // Обновляем mobile навигацию
    updateMobileNavigation(currentPath);
    
    // Обновляем sidebar навигацию (если есть)
    updateSidebarNavigation(currentPath);
}

/**
 * Обновляет активное состояние в header навигации
 */
function updateHeaderNavigation(currentPath: string): void {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const anchor = link as HTMLAnchorElement;
        const href = anchor.getAttribute('href');
        
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            anchor.classList.add('active');
        } else {
            anchor.classList.remove('active');
        }
    });
}

/**
 * Обновляет активное состояние в мобильной навигации
 */
function updateMobileNavigation(currentPath: string): void {
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        const anchor = link as HTMLAnchorElement;
        const href = anchor.getAttribute('href');
        
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            anchor.classList.add('active');
        } else {
            anchor.classList.remove('active');
        }
    });
}

/**
 * Обновляет активное состояние в sidebar навигации (для dashboard страниц)
 */
function updateSidebarNavigation(currentPath: string): void {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const anchor = item as HTMLAnchorElement;
        const href = anchor.getAttribute('href');
        
        if (href === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Инициализирует навигацию для текущей страницы
 * Вызывается автоматически при загрузке каждой страницы
 */
export function initNavigation(): void {
    // Обновляем активное состояние при загрузке страницы
    updateActiveNavigation();
    
    // Обновляем активное состояние при изменении URL (для SPA)
    window.addEventListener('popstate', updateActiveNavigation);
    
    // Обновляем активное состояние при клике на ссылки навигации
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('.nav-link, .mobile-nav-link, .nav-item');
        
        if (link) {
            // Небольшая задержка для обновления после смены URL
            setTimeout(updateActiveNavigation, 10);
        }
    });
}

/**
 * Проверяет, является ли указанный путь активным
 */
export function isPathActive(path: string): boolean {
    const currentPath = window.location.pathname;
    return currentPath === path || (currentPath === '/' && path === '/');
}
