export type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type UiButtonSize = 'md' | 'sm';
export type UiStatusTone = 'neutral' | 'success' | 'danger' | 'warning';

interface ButtonMarkupOptions {
    attrs?: Record<string, string | number | undefined>;
    extraClasses?: string[];
    label: string;
    size?: UiButtonSize;
    variant?: UiButtonVariant;
}

interface EmptyStateOptions {
    description: string;
    title: string;
}

interface StatusBadgeOptions {
    label: string;
    tone?: UiStatusTone;
}

interface TableEmptyStateOptions extends EmptyStateOptions {
    colspan: number;
}

export function escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getButtonClassName(
    variant: UiButtonVariant = 'secondary',
    size: UiButtonSize = 'md',
    extraClasses: string[] = []
): string {
    const classes = ['btn', `btn-${variant}`];

    if (size === 'sm') {
        classes.push('btn-sm');
    }

    return classes.concat(extraClasses).join(' ');
}

export function renderButtonMarkup(options: ButtonMarkupOptions): string {
    const {
        attrs = {},
        extraClasses = [],
        label,
        size = 'md',
        variant = 'secondary'
    } = options;

    return `<button class="${getButtonClassName(variant, size, extraClasses)}"${renderAttributes(attrs)}>
        ${escapeHtml(label)}
    </button>`;
}

export function renderEmptyStateMarkup(options: EmptyStateOptions): string {
    return `
        <div class="empty-state">
            <div class="empty-state-icon"></div>
            <h3>${escapeHtml(options.title)}</h3>
            <p>${escapeHtml(options.description)}</p>
        </div>
    `;
}

export function renderStatusBadgeMarkup(options: StatusBadgeOptions): string {
    const tone = options.tone || 'neutral';

    return `
        <span class="ui-status ui-status--${tone}">
            ${escapeHtml(options.label)}
        </span>
    `;
}

export function renderTableEmptyStateRow(options: TableEmptyStateOptions): string {
    return `
        <tr>
            <td colspan="${options.colspan}" class="table-empty-state">
                ${renderEmptyStateMarkup({
                    title: options.title,
                    description: options.description
                })}
            </td>
        </tr>
    `;
}

function renderAttributes(attrs: Record<string, string | number | undefined>): string {
    const parts = Object.entries(attrs)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`);

    return parts.join('');
}
