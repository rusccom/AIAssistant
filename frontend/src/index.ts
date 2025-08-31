import './style.css';
import { insertHeader, resetHeader } from './layout/Header';
import { insertFooter } from './layout/Footer';
import { initSimpleFouc } from './utils/simple-fouc';
import { initNavigation } from './utils/navigation';
import { redirectIfAuthenticated } from './utils/auth';

// Redirect authenticated users to dashboard
redirectIfAuthenticated();

// Initialize anti-FOUC system immediately
initSimpleFouc();

// Initialize navigation highlighting
initNavigation();

// Initialize side navigation
const initSideNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section[id]');

    // Handle nav item clicks
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target) {
                const targetSection = document.getElementById(target);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Update active nav item on scroll
    const updateActiveNav = () => {
        const scrollPosition = window.scrollY + 100;
        let found = false;

        sections.forEach(section => {
            const htmlSection = section as HTMLElement;
            const sectionTop = htmlSection.offsetTop;
            const sectionHeight = htmlSection.offsetHeight;
            const sectionId = htmlSection.id;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight && !found) {
                navItems.forEach(item => item.classList.remove('active'));
                const activeItem = document.querySelector(`[data-target="${sectionId}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                    found = true;
                }
            }
        });

        // If no section is active, activate hero by default
        if (!found) {
            navItems.forEach(item => item.classList.remove('active'));
            const heroItem = document.querySelector('[data-target="hero"]');
            if (heroItem) {
                heroItem.classList.add('active');
            }
        }
    };

    // Throttled scroll handler
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveNav();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initial call
    updateActiveNav();
};

const initializePage = () => {
    resetHeader(); // Force header reload
    insertHeader();
    insertFooter();
    
    // Initialize side navigation
    setTimeout(() => {
        initSideNavigation();
    }, 100);
};

// Wait for the DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
} 
