import { UI_CONFIG } from '../../../utils/constants';

export function createPageRange(currentPage: number, totalPages: number): Array<number | '...'> {
    const maxVisiblePages = UI_CONFIG.PAGINATION.MAX_VISIBLE_PAGES;
    const pages: Array<number | '...'> = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
            pages.push('...');
        }
    }

    for (let page = startPage; page <= endPage; page += 1) {
        pages.push(page);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
    }

    return pages;
}

export function debounce<T extends unknown[]>(
    callback: (...args: T) => void,
    wait: number
): (...args: T) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: T) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(...args), wait);
    };
}
