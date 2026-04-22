import {
    escapeHtml,
    renderButtonMarkup,
    renderEmptyStateMarkup,
    renderStatusBadgeMarkup
} from '../../../shared/ui/primitives';
import { t } from '../../localization';

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
        title: t('dashboard.error.title'),
        description: t('dashboard.error.description')
    });
}

export function renderDashboardLoadingSkeleton(count = 3): string {
    return Array.from({ length: count }, () => renderSessionSkeletonCard()).join('');
}

export function renderDashboardNoResultsState(): string {
    return renderEmptyStateMarkup({
        title: t('dashboard.noResults.title'),
        description: t('dashboard.noResults.description')
    });
}

export function renderDashboardEmptyState(): string {
    return renderEmptyStateMarkup({
        title: t('dashboard.empty.title'),
        description: t('dashboard.empty.description')
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
                <h3 class="session-id">${escapeHtml(t('dashboard.session.id', { id: model.id }))}</h3>
                ${renderStatusBadgeMarkup({
                    label: model.isActive ? t('dashboard.session.active') : t('dashboard.session.inactive'),
                    tone: model.isActive ? 'success' : 'neutral'
                })}
            </div>
            <div class="session-details">
                ${renderSessionDetail(t('dashboard.session.created'), model.createdDate)}
                ${renderSessionDetail(t('dashboard.session.time'), model.createdTime)}
                ${renderSessionDetail(t('dashboard.session.messages'), String(model.messages))}
                ${renderSessionDetail(t('dashboard.session.status'), model.status)}
            </div>
            <div class="session-actions">
                <a
                    href="${escapeHtml(model.detailsHref)}"
                    class="btn btn-primary session-details-link"
                >
                    ${escapeHtml(t('dashboard.session.viewDetails'))}
                </a>
                ${renderButtonMarkup({
                    attrs: {
                        'data-session-id': model.id,
                        type: 'button'
                    },
                    extraClasses: ['session-download-btn'],
                    label: t('dashboard.session.download'),
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
