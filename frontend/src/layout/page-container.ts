import { insertSidebar } from './Sidebar';
import './layout.css';
import { getUser } from '../utils/auth';

function setupMobileNavigation() {
    const toggleButton = document.getElementById('mobile-nav-toggle');
    const mobileMenu = document.getElementById('mobile-nav-menu');
    const logoutLink = document.getElementById('mobile-logout-link');
    const passwordModal = document.getElementById('password-change-modal');
    const mobileUserProfile = document.querySelector('.mobile-user-profile');

    // Update mobile user email
    updateMobileUserEmail();

    if (toggleButton && mobileMenu) {
        toggleButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('mobile-nav-open');
            toggleButton.classList.toggle('mobile-nav-active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!toggleButton.contains(target) && !mobileMenu.contains(target)) {
                mobileMenu.classList.remove('mobile-nav-open');
                toggleButton.classList.remove('mobile-nav-active');
            }
        });
    }

    // Handle mobile user profile click
    if (mobileUserProfile && passwordModal) {
        mobileUserProfile.addEventListener('click', (e) => {
            e.preventDefault();
            passwordModal.style.display = 'flex';
            // Close mobile menu
            mobileMenu?.classList.remove('mobile-nav-open');
            toggleButton?.classList.remove('mobile-nav-active');
        });
    }

    // Handle logout
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }
}

async function updateMobileUserEmail() {
    const mobileEmailEl = document.getElementById('mobile-user-email');
    if (!mobileEmailEl) return;

    let user = getUser();
    if (!user) {
        // Try to fetch user data
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    user = await response.json();
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        }
    }

    mobileEmailEl.textContent = user?.email || 'admin@ai.com';
}

export function setupPage(pageContent: string) {
    const contentWrapper = document.getElementById('page-content-wrapper');
    if (!contentWrapper) {
        console.error('Page content wrapper not found!');
        return;
    }

    // Insert the page-specific content into the wrapper
    contentWrapper.innerHTML = pageContent;

    // Insert the sidebar. Its visibility is controlled by CSS.
    insertSidebar();

    // Add class to body to indicate sidebar is loaded.
    // This class is used by CSS to toggle between sidebar and main header.
    document.body.classList.add('sidebar-loaded');

    // Setup mobile navigation
    setupMobileNavigation();
} 