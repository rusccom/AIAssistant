import './style.css';
import { insertHeader, resetHeader } from './layout/Header';
import { insertFooter } from './layout/Footer';
import { initSimpleFouc } from './utils/simple-fouc';
import { redirectIfAuthenticated } from './utils/auth';
import { initNavigation } from './utils/navigation';
// import { insertSidebar } from './layout/Sidebar';

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
    // insertSidebar();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
