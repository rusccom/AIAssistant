import {
    getClientThemes,
    resolveClientThemeId,
    type ClientThemeId
} from './theme-registry';
import { loadStoredClientThemeId, saveClientThemeId } from './theme-storage';

const CLIENT_THEME_ATTRIBUTE = 'data-client-theme';
const CLIENT_THEME_BOUND_ATTRIBUTE = 'clientThemeBound';
const CLIENT_THEME_SELECTOR = '[data-client-theme-select]';

export const CLIENT_THEME_CHANGE_EVENT = 'client-theme:change';

export function initializeClientTheme(): void {
    setClientThemeAttribute(resolveClientThemeId(loadStoredClientThemeId()));
}

export function getActiveClientThemeId(): ClientThemeId {
    return resolveClientThemeId(
        document.documentElement.getAttribute(CLIENT_THEME_ATTRIBUTE)
    );
}

export function applyClientTheme(themeId: ClientThemeId): void {
    setClientThemeAttribute(themeId);
    saveClientThemeId(themeId);
    syncThemeSelects(document, themeId);
    emitClientThemeChange(themeId);
}

export function mountClientThemeControls(root: ParentNode = document): void {
    const themeId = getActiveClientThemeId();
    getThemeSelects(root).forEach((select) => setupThemeSelect(select, themeId));
}

function emitClientThemeChange(themeId: ClientThemeId): void {
    document.dispatchEvent(
        new CustomEvent<ClientThemeId>(CLIENT_THEME_CHANGE_EVENT, {
            detail: themeId
        })
    );
}

function getThemeSelects(root: ParentNode): HTMLSelectElement[] {
    return Array.from(root.querySelectorAll(CLIENT_THEME_SELECTOR));
}

function renderThemeOptions(select: HTMLSelectElement): void {
    const options = getClientThemes()
        .map(
            (theme) =>
                `<option value="${theme.id}">${theme.label}</option>`
        )
        .join('');

    select.innerHTML = options;
}

function bindThemeSelect(select: HTMLSelectElement): void {
    if (select.dataset[CLIENT_THEME_BOUND_ATTRIBUTE] === 'true') {
        return;
    }

    select.addEventListener('change', () => {
        applyClientTheme(resolveClientThemeId(select.value));
    });

    select.dataset[CLIENT_THEME_BOUND_ATTRIBUTE] = 'true';
}

function setupThemeSelect(select: HTMLSelectElement, themeId: ClientThemeId): void {
    renderThemeOptions(select);
    syncThemeSelect(select, themeId);
    bindThemeSelect(select);
}

function setClientThemeAttribute(themeId: ClientThemeId): void {
    document.documentElement.setAttribute(CLIENT_THEME_ATTRIBUTE, themeId);
}

function syncThemeSelect(select: HTMLSelectElement, themeId: ClientThemeId): void {
    select.value = themeId;
}

function syncThemeSelects(root: ParentNode, themeId: ClientThemeId): void {
    getThemeSelects(root).forEach((select) => syncThemeSelect(select, themeId));
}
