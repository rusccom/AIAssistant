import './features/dashboard/styles/dashboard-page.css';

import pageContent from './dashboard.content.html';
import { setupPage } from './layout/app/page-container';
import { protectPage } from './utils/auth';
import { initNavigation } from './utils/navigation';
import { initSimpleFouc } from './utils/simple-fouc';
import { apiRequest, getAuthToken } from './utils/api-client';
import { API_ENDPOINTS, ROUTES } from './utils/constants';
import { showError } from './utils/error-handler';
import {
    renderDashboardEmptyState,
    renderDashboardErrorState,
    renderDashboardLoadingSkeleton,
    renderDashboardNoResultsState,
    renderSessionCards
} from './features/dashboard/renderers/dashboard-ui';

protectPage();
initSimpleFouc();
initNavigation();

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

function initializePage(): void {
    setupPage(pageContent);

    if (!getAuthToken()) {
        window.location.href = ROUTES.LOGIN;
        return;
    }

    setupSearch();
    setupSessionListInteractions();
    void loadDashboardData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

function setupSearch(): void {
    const searchInput = document.getElementById('session-search') as HTMLInputElement | null;

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener('input', (event) => {
        const query = (event.target as HTMLInputElement).value.toLowerCase().trim();
        filterSessions(query);
    });
}

function setupSessionListInteractions(): void {
    const sessionList = document.getElementById('session-list');

    if (!sessionList) {
        console.error('Session list element not found.');
        return;
    }

    sessionList.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;

        if (!target) {
            return;
        }

        const downloadButton = target.closest<HTMLButtonElement>('.session-download-btn');
        if (downloadButton?.dataset.sessionId) {
            event.preventDefault();
            event.stopPropagation();
            void downloadSession(downloadButton.dataset.sessionId);
            return;
        }

        if (target.closest('a, button')) {
            return;
        }

        const card = target.closest<HTMLElement>('.session-card');
        if (card?.dataset.detailsHref) {
            window.location.href = card.dataset.detailsHref;
        }
    });
}

function filterSessions(query: string): void {
    filteredSessions = query
        ? allSessions.filter((session) =>
            session.id.toLowerCase().includes(query) ||
            new Date(session.createdAt).toLocaleDateString().includes(query)
        )
        : [...allSessions];

    renderSessions(filteredSessions);
}

function updateStats(stats: DashboardStats): void {
    animateStat('total-sessions', stats.totalSessions);
    animateStat('total-messages', stats.totalMessages);
    animateStat('active-sessions', stats.activeSessions);
}

function animateStat(elementId: string, targetValue: number): void {
    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    const duration = 1000;
    const startTime = performance.now();

    const updateNumber = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(targetValue * easedProgress);

        element.textContent = String(currentValue);

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
            return;
        }

        element.textContent = String(targetValue);
    };

    requestAnimationFrame(updateNumber);
}

function showLoadingSkeleton(): void {
    const sessionList = document.getElementById('session-list');

    if (sessionList) {
        sessionList.innerHTML = renderDashboardLoadingSkeleton();
    }
}

function showEmptyState(): void {
    const sessionList = document.getElementById('session-list');

    if (sessionList) {
        sessionList.innerHTML = renderDashboardEmptyState();
    }
}

async function loadDashboardData(): Promise<void> {
    if (!getAuthToken()) {
        return;
    }

    showLoadingSkeleton();

    try {
        const { data: sessions } = await apiRequest<SessionData[]>(API_ENDPOINTS.DASHBOARD.SESSIONS);

        allSessions = sessions || [];
        filteredSessions = [...allSessions];

        updateStats({
            totalSessions: allSessions.length,
            totalMessages: allSessions.reduce((sum, session) => sum + (session.userMessagesCount || 0), 0),
            activeSessions: allSessions.filter((session) => Boolean(session.id)).length
        });

        if (allSessions.length === 0) {
            showEmptyState();
            return;
        }

        renderSessions(allSessions);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);

        const sessionList = document.getElementById('session-list');
        if (sessionList) {
            sessionList.innerHTML = renderDashboardErrorState();
        }
    }
}

function renderSessions(sessions: SessionData[]): void {
    const sessionList = document.getElementById('session-list');

    if (!sessionList) {
        return;
    }

    if (sessions.length === 0) {
        sessionList.innerHTML = renderDashboardNoResultsState();
        return;
    }

    sessionList.innerHTML = renderSessionCards(
        sessions.map((session) => {
            const createdAt = new Date(session.createdAt);
            const lastActivity = new Date(session.lastActivity || session.createdAt);
            const daysDiff = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

            return {
                createdDate: createdAt.toLocaleDateString(),
                createdTime: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                detailsHref: `/session.html?id=${encodeURIComponent(session.id)}`,
                id: session.id,
                isActive: daysDiff <= 7,
                messages: session.userMessagesCount || 0,
                status: session.status || 'Completed'
            };
        })
    );
}

async function downloadSession(sessionId: string): Promise<void> {
    if (!getAuthToken()) {
        return;
    }

    try {
        const { response } = await apiRequest(`${API_ENDPOINTS.SESSIONS.EXPORT}/${sessionId}/export`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `session-${sessionId}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download session:', error);
        showError('Failed to download session. Please try again.');
    }
}
