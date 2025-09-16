import './dashboard.css';
import { initSimpleFouc } from './utils/simple-fouc';
import { protectPage } from './utils/auth';
import { initNavigation } from './utils/navigation';
import { setupPage } from './layout/page-container';
import pageContent from './dashboard.content.html';

// Новые централизованные утилиты
import { apiRequest, getAuthToken } from './utils/api-client';
import { ROUTES, API_ENDPOINTS } from './utils/constants';
import { showError, handleApiError } from './utils/error-handler';
import { LoadingSpinner } from './components';

// Protect this page
protectPage();

// Initialize anti-FOUC system immediately
initSimpleFouc();

// Initialize navigation highlighting
initNavigation();

// Declare lucide for TypeScript
declare global {
    interface Window {
        lucide: {
            createIcons: () => void;
        };
    }
}

interface SessionData {
    id: string;
    createdAt: string;
    userMessagesCount: number;
    status?: string;
    lastActivity?: string;
}

interface DashboardStats {
    totalSessions: number;
    totalMessages: number;
    activeSessions: number;
}

let allSessions: SessionData[] = [];
let filteredSessions: SessionData[] = [];

function initializePage() {
    setupPage(pageContent);
    
    const token = getAuthToken();
    if (!token) {
        // protectPage already handles this, but as a fallback
        window.location.href = ROUTES.LOGIN;
        return;
    }

    setupSearch();
    
    const sessionList = document.getElementById('session-list');
    if (!sessionList) {
        console.error('Session list element not found!');
        return;
    }

    loadDashboardData().then(() => {
        // Ensure icons are created after data is loaded and rendered
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

function setupSearch() {
    const searchInput = document.getElementById('session-search') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
            filterSessions(query);
        });
    }
}

function filterSessions(query: string) {
    if (!query) {
        filteredSessions = [...allSessions];
    } else {
        filteredSessions = allSessions.filter(session => 
            session.id.toLowerCase().includes(query) ||
            new Date(session.createdAt).toLocaleDateString().includes(query)
        );
    }
    renderSessions(filteredSessions);
}

function updateStats(stats: DashboardStats) {
    const totalSessionsEl = document.getElementById('total-sessions');
    const totalMessagesEl = document.getElementById('total-messages');
    const activeSessionsEl = document.getElementById('active-sessions');
    
    if (totalSessionsEl) {
        animateNumber(totalSessionsEl, stats.totalSessions);
    }
    if (totalMessagesEl) {
        animateNumber(totalMessagesEl, stats.totalMessages);
    }
    if (activeSessionsEl) {
        animateNumber(activeSessionsEl, stats.activeSessions);
    }
}

function animateNumber(element: HTMLElement, targetValue: number) {
    const duration = 1000;
    const startValue = 0;
    const startTime = performance.now();
    
    const updateNumber = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutCubic);
        
        element.textContent = currentValue.toString();
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = targetValue.toString();
        }
    };
    
    requestAnimationFrame(updateNumber);
}

function showLoadingSkeleton() {
    const sessionList = document.getElementById('session-list');
    if (!sessionList) return;
    
    sessionList.innerHTML = Array(3).fill(0).map(() => `
        <div class="session-card">
            <div class="session-card-header">
                <div class="loading-skeleton" style="height: 1.5rem; width: 120px;"></div>
                <div class="loading-skeleton" style="height: 1.5rem; width: 80px;"></div>
            </div>
            <div class="session-details">
                <div class="session-detail">
                    <div class="loading-skeleton" style="height: 1rem; width: 60px; margin-bottom: 0.5rem;"></div>
                    <div class="loading-skeleton" style="height: 1rem; width: 100px;"></div>
                </div>
                <div class="session-detail">
                    <div class="loading-skeleton" style="height: 1rem; width: 80px; margin-bottom: 0.5rem;"></div>
                    <div class="loading-skeleton" style="height: 1rem; width: 40px;"></div>
                </div>
            </div>
            <div class="session-actions">
                <div class="loading-skeleton" style="height: 2rem; width: 100px;"></div>
                <div class="loading-skeleton" style="height: 2rem; width: 80px;"></div>
            </div>
        </div>
    `).join('');
}

function showEmptyState() {
    const sessionList = document.getElementById('session-list');
    if (!sessionList) return;
    
    sessionList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                
            </div>
            <h3>No sessions found</h3>
            <p>Start your first AI conversation to begin tracking sessions.</p>
        </div>
    `;
    
    // Initialize icon
}

async function loadDashboardData() {
    const token = getAuthToken();
    if (!token) return;

    showLoadingSkeleton();

    try {
        const { data: sessions } = await apiRequest(API_ENDPOINTS.DASHBOARD.SESSIONS);
        console.log(`✅ Dashboard: Получено ${sessions.length} сессий`);
            
        allSessions = sessions || [];
        filteredSessions = [...allSessions];

        // Calculate stats с безопасными fallback значениями
        const stats: DashboardStats = {
            totalSessions: allSessions.length,
            totalMessages: allSessions.reduce((sum: number, session: any) => {
                return sum + (session.userMessagesCount || 0);
            }, 0),
            activeSessions: allSessions.filter((session: any) => {
                try {
                    // Безопасная проверка активности
                    if (!session.id) return false;
                    return true; // Упрощаем - считаем все сессии активными пока нет миграции
                } catch (error) {
                    return false;
                }
            }).length
        };

        updateStats(stats);

        if (allSessions.length === 0) {
            showEmptyState();
        } else {
            renderSessions(allSessions);
        }

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        const sessionList = document.getElementById('session-list');
        if (sessionList) {
            sessionList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        
                    </div>
                    <h3>Unable to load sessions</h3>
                    <p>Please check your connection and try refreshing the page.</p>
                </div>
            `;
            
            // Initialize icon
        }
    }
}

function renderSessions(sessions: SessionData[]) {
    const sessionList = document.getElementById('session-list');
    if (!sessionList) return;

            if (sessions.length === 0) {
        sessionList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    
                </div>
                <h3>No matching sessions</h3>
                <p>Try adjusting your search criteria or clear the search.</p>
            </div>
        `;
        
        // Initialize icon
                return;
            }

    sessionList.innerHTML = sessions.map(session => {
        const createdAt = new Date(session.createdAt);
        const formattedDate = createdAt.toLocaleDateString();
        const formattedTime = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isActive = (() => {
            const lastActivity = new Date(session.lastActivity || session.createdAt);
            const now = new Date();
            const daysDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        })();

        return `
            <div class="session-card" onclick="window.location.href='/session.html?id=${session.id}'">
                <div class="session-card-header">
                    <h3 class="session-id">Session #${session.id}</h3>
                    <span class="session-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
                </div>
                
                <div class="session-details">
                    <div class="session-detail">
                        <span class="session-detail-label">Created</span>
                        <span class="session-detail-value">${formattedDate}</span>
                    </div>
                    <div class="session-detail">
                        <span class="session-detail-label">Time</span>
                        <span class="session-detail-value">${formattedTime}</span>
                    </div>
                    <div class="session-detail">
                        <span class="session-detail-label">Messages</span>
                        <span class="session-detail-value">${session.userMessagesCount}</span>
                    </div>
                    <div class="session-detail">
                        <span class="session-detail-label">Status</span>
                        <span class="session-detail-value">${session.status || 'Completed'}</span>
                    </div>
                </div>
                
                <div class="session-actions">
                    <a href="/session.html?id=${session.id}" class="btn btn-primary" onclick="event.stopPropagation();">
                        View Details
                    </a>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); downloadSession('${session.id}');">
                        Download
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function downloadSession(sessionId: string) {
    const token = getAuthToken();
    if (!token) return;

    try {
        const { response } = await apiRequest(`${API_ENDPOINTS.SESSIONS.EXPORT}/${sessionId}/export`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Failed to download session:', error);
        showError('Failed to download session. Please try again.');
    }
}

// Make downloadSession available globally
(window as any).downloadSession = downloadSession;
