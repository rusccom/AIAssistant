import {
    escapeHtml,
    renderButtonMarkup,
    renderEmptyStateMarkup,
    renderStatusBadgeMarkup
} from '../../../shared/ui/primitives';

export interface SessionCardModel {
    createdDate: string;
    createdTime: string;
    detailsHref: string;
    id: string;
    isActive: boolean;
    messages: number;
    status: string;
}

export function renderDashboardErrorState(): string {
    return renderEmptyStateMarkup({
        title: 'Unable to load sessions',
        description: 'Please check your connection and try refreshing the page.'
    });
}

export function renderDashboardLoadingSkeleton(count = 3): string {
    return Array.from({ length: count }, () => renderSessionSkeletonCard()).join('');
}

export function renderDashboardNoResultsState(): string {
    return renderEmptyStateMarkup({
        title: 'No matching sessions',
        description: 'Try adjusting your search criteria or clear the search.'
    });
}

export function renderDashboardEmptyState(): string {
    return renderEmptyStateMarkup({
        title: 'No sessions found',
        description: 'Start your first AI conversation to begin tracking sessions.'
    });
}

export function renderSessionCards(models: SessionCardModel[]): string {
    return models.map((model) => renderSessionCard(model)).join('');
}

function renderSessionCard(model: SessionCardModel): string {
    return `
        <article
            class="session-card"
            data-details-href="${escapeHtml(model.detailsHref)}"
            data-session-id="${escapeHtml(model.id)}"
        >
            <div class="session-card-header">
                <h3 class="session-id">Session #${escapeHtml(model.id)}</h3>
                ${renderStatusBadgeMarkup({
                    label: model.isActive ? 'Active' : 'Inactive',
                    tone: model.isActive ? 'success' : 'neutral'
                })}
            </div>
            <div class="session-details">
                ${renderSessionDetail('Created', model.createdDate)}
                ${renderSessionDetail('Time', model.createdTime)}
                ${renderSessionDetail('Messages', String(model.messages))}
                ${renderSessionDetail('Status', model.status)}
            </div>
            <div class="session-actions">
                <a
                    href="${escapeHtml(model.detailsHref)}"
                    class="btn btn-primary session-details-link"
                >
                    View Details
                </a>
                ${renderButtonMarkup({
                    attrs: {
                        'data-session-id': model.id,
                        type: 'button'
                    },
                    extraClasses: ['session-download-btn'],
                    label: 'Download',
                    variant: 'secondary'
                })}
            </div>
        </article>
    `;
}

function renderSessionDetail(label: string, value: string): string {
    return `
        <div class="session-detail">
            <span class="session-detail-label">${escapeHtml(label)}</span>
            <span class="session-detail-value">${escapeHtml(value)}</span>
        </div>
    `;
}

function renderSessionSkeletonCard(): string {
    return `
        <div class="session-card session-card--skeleton">
            <div class="session-card-header">
                <div class="loading-skeleton session-skeleton session-skeleton--title"></div>
                <div class="loading-skeleton session-skeleton session-skeleton--badge"></div>
            </div>
            <div class="session-details">
                <div class="session-detail">
                    <div class="loading-skeleton session-skeleton session-skeleton--label"></div>
                    <div class="loading-skeleton session-skeleton session-skeleton--value"></div>
                </div>
                <div class="session-detail">
                    <div class="loading-skeleton session-skeleton session-skeleton--label"></div>
                    <div class="loading-skeleton session-skeleton session-skeleton--value session-skeleton--short"></div>
                </div>
            </div>
            <div class="session-actions">
                <div class="loading-skeleton session-skeleton session-skeleton--button"></div>
                <div class="loading-skeleton session-skeleton session-skeleton--button session-skeleton--alt"></div>
            </div>
        </div>
    `;
}
