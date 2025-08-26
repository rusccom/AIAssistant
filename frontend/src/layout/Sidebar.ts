import { getUser } from '../utils/auth';

let sidebarInserted = false;

const sidebarTemplate = `
    <aside class="dashboard-sidebar">
        <div class="sidebar-header">
            <a href="/" class="sidebar-brand">
                <div class="brand-icon">🤖</div>
                <span class="brand-text">AIAssistant</span>
            </a>
        </div>
        <nav class="sidebar-nav">
            <a href="/dashboard.html" class="nav-item" id="nav-dashboard">
                <svg class="nav-icon" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"></path></svg>
                <span class="nav-text">Dashboard</span>
            </a>
            <a href="/bot-settings.html" class="nav-item" id="nav-bot-settings">
                <svg class="nav-icon" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65c-.03-.24-.24-.42-.49-.42h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>
                <span class="nav-text">Bot Settings</span>
            </a>
        </nav>
        <div class="sidebar-footer">
            <div class="user-profile" id="user-profile-button" style="cursor: pointer;">
                <div class="user-avatar">
                    <svg class="user-avatar-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                </div>
                <div class="user-info">
                    <div class="user-name">Admin</div>
                    <div class="user-email">admin@ai.com</div>
                </div>
            </div>
            <a href="#" class="nav-item logout-item" id="logout-button">
                <svg class="nav-icon" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"></path></svg>
                <span class="nav-text">Sign Out</span>
            </a>
        </div>
    </aside>
`;

const handleSidebarLogout = () => {
    // Простой logout - очищаем токен и перенаправляем
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('🔓 Sidebar logout');
    window.location.href = '/login.html';
};

export const insertSidebar = () => {
    if (sidebarInserted) {
        setActiveLink();
        return;
    }

    const dashboardLayout = document.getElementById('dashboard-layout');
    if (dashboardLayout) {
        dashboardLayout.insertAdjacentHTML('afterbegin', sidebarTemplate);
        sidebarInserted = true;
        
        setupLogout();
        setupProfileModal();
        setActiveLink();
        updateUserInfo();
    }
};

const setupProfileModal = () => {
    const userProfileButton = document.getElementById('user-profile-button');
    const modal = document.getElementById('password-change-modal');
    const closeBtn = document.getElementById('close-password-modal-btn');
    const cancelBtn = document.getElementById('cancel-password-change-btn');

    if (!modal) return;

    const openModal = () => modal.style.display = 'flex';
    const closeModal = () => modal.style.display = 'none';

    userProfileButton?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    const form = document.getElementById('password-change-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;
        const errorDiv = document.getElementById('password-change-error');

        if (!errorDiv) return;

        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update password.');
            }

            // Success
            closeModal();
            alert('Password updated successfully!'); // Or show a more subtle notification
            (form as HTMLFormElement).reset();
            errorDiv.style.display = 'none';

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        }
    });
};

const setupLogout = () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleSidebarLogout();
        });
    }
}

async function fetchAndCacheUser() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

const updateUserInfo = async () => {
    let user = getUser();
    if (!user) {
        user = await fetchAndCacheUser();
    }

    if (!user) {
        // Still no user, maybe token expired, logout
        handleSidebarLogout();
        return;
    }

    const userNameEl = document.querySelector('.user-name');
    const userEmailEl = document.querySelector('.user-email');

    if (userNameEl) {
        userNameEl.textContent = user.firstName ? `${user.firstName} ${user.lastName}` : 'Admin';
    }
    if (userEmailEl) {
        userEmailEl.textContent = user.email || 'admin@ai.com';
    }
}

const setActiveLink = async () => {
    // Используем новую универсальную систему навигации
    const { updateActiveNavigation } = await import('../utils/navigation');
    updateActiveNavigation();
};
