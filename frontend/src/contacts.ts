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
    
    // Setup contact form
    const contactForm = document.getElementById('contact-form') as HTMLFormElement;
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

const handleContactForm = async (e: Event) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Here you would typically send the data to your backend
    console.log('Contact form submitted:', data);
    
    // Show success message (you can implement a proper notification system)
    alert('Thank you for your message! We\'ll get back to you within 24 hours.');
    
    // Reset form
    form.reset();
}; 
