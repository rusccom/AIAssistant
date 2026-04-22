import {
    DEFAULT_APP_LANGUAGE,
    getAppLanguageLocale,
    getAppLanguages,
    resolveAppLanguage
} from './language-registry';
import { loadStoredAppLanguage, saveAppLanguage } from './language-storage';
import { translationsByLanguage, type TranslationKey } from './translations';
import type { AppLanguage, TranslationParams } from './types';

const ACTIVE_LANGUAGE_ATTRIBUTE = 'data-app-language';
const BOUND_SELECT_KEY = 'appLanguageBound';
const HTML_SELECTOR_ATTRIBUTE = 'data-i18n-html';
const LANGUAGE_SELECT_SELECTOR = '[data-app-language-select]';
const TEXT_SELECTOR_ATTRIBUTE = 'data-i18n';

type LanguageAttributeMap = {
    attr: string;
    name: 'alt' | 'aria-label' | 'placeholder' | 'title';
};

const languageAttributes: LanguageAttributeMap[] = [
    { attr: 'data-i18n-alt', name: 'alt' },
    { attr: 'data-i18n-aria-label', name: 'aria-label' },
    { attr: 'data-i18n-placeholder', name: 'placeholder' },
    { attr: 'data-i18n-title', name: 'title' }
];

export const APP_LANGUAGE_CHANGE_EVENT = 'app-language:change';

let activeLanguage = loadStoredAppLanguage() || DEFAULT_APP_LANGUAGE;
let activeTitleKey: TranslationKey | null = null;

export function initializeAppLanguage(titleKey?: TranslationKey): void {
    if (titleKey) {
        activeTitleKey = titleKey;
    }

    applyLanguage(activeLanguage, false);
}

export function getActiveAppLanguage(): AppLanguage {
    return activeLanguage;
}

export function getActiveAppLocale(): string {
    return getAppLanguageLocale(activeLanguage);
}

export function setPageTitle(titleKey: TranslationKey): void {
    activeTitleKey = titleKey;
    document.title = t(titleKey);
}

export function applyAppLanguage(language: AppLanguage): void {
    applyLanguage(resolveAppLanguage(language), true);
}

export function refreshLocalizedUi(root: ParentNode = document): void {
    translateTextNodes(root);
    translateHtmlNodes(root);
    translateAttributes(root);
    mountAppLanguageControls(root);

    if (root === document && activeTitleKey) {
        document.title = t(activeTitleKey);
    }
}

export function mountAppLanguageControls(root: ParentNode = document): void {
    getLanguageSelects(root).forEach((select) => setupLanguageSelect(select));
}

export function t(key: TranslationKey, params: TranslationParams = {}): string {
    const template = translationsByLanguage[activeLanguage][key]
        || translationsByLanguage.en[key]
        || key;

    return Object.entries(params).reduce((result, [paramKey, value]) => {
        return result.split(`{{${paramKey}}}`).join(String(value));
    }, template);
}

function applyLanguage(language: AppLanguage, persist: boolean): void {
    activeLanguage = language;

    if (persist) {
        saveAppLanguage(language);
    }

    document.documentElement.lang = language;
    document.documentElement.setAttribute(ACTIVE_LANGUAGE_ATTRIBUTE, language);
    refreshLocalizedUi(document);
    document.dispatchEvent(
        new CustomEvent<AppLanguage>(APP_LANGUAGE_CHANGE_EVENT, {
            detail: language
        })
    );
}

function bindLanguageSelect(select: HTMLSelectElement): void {
    if (select.dataset[BOUND_SELECT_KEY] === 'true') {
        return;
    }

    select.addEventListener('change', () => {
        applyAppLanguage(resolveAppLanguage(select.value));
    });
    select.dataset[BOUND_SELECT_KEY] = 'true';
}

function getLanguageSelects(root: ParentNode): HTMLSelectElement[] {
    return Array.from(root.querySelectorAll<HTMLSelectElement>(LANGUAGE_SELECT_SELECTOR));
}

function getNodesWithAttribute(root: ParentNode, attribute: string): HTMLElement[] {
    const selector = `[${attribute}]`;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));

    if (root instanceof HTMLElement && root.matches(selector)) {
        nodes.unshift(root);
    }

    return nodes;
}

function getOptionLabel(language: AppLanguage): string {
    return t(language === 'pl' ? 'common.language.option.pl' : 'common.language.option.en');
}

function renderLanguageOptions(select: HTMLSelectElement): void {
    select.innerHTML = '';

    getAppLanguages().forEach((language) => {
        const option = document.createElement('option');
        option.value = language.id;
        option.textContent = getOptionLabel(language.id);
        select.appendChild(option);
    });
}

function setupLanguageSelect(select: HTMLSelectElement): void {
    renderLanguageOptions(select);
    select.value = activeLanguage;
    bindLanguageSelect(select);
}

function translateAttributes(root: ParentNode): void {
    languageAttributes.forEach(({ attr, name }) => {
        getNodesWithAttribute(root, attr).forEach((element) => {
            const key = element.getAttribute(attr) as TranslationKey | null;

            if (key) {
                element.setAttribute(name, t(key));
            }
        });
    });
}

function translateHtmlNodes(root: ParentNode): void {
    getNodesWithAttribute(root, HTML_SELECTOR_ATTRIBUTE).forEach((element) => {
        const key = element.getAttribute(HTML_SELECTOR_ATTRIBUTE) as TranslationKey | null;

        if (key) {
            element.innerHTML = t(key);
        }
    });
}

function translateTextNodes(root: ParentNode): void {
    getNodesWithAttribute(root, TEXT_SELECTOR_ATTRIBUTE).forEach((element) => {
        const key = element.getAttribute(TEXT_SELECTOR_ATTRIBUTE) as TranslationKey | null;

        if (key) {
            element.textContent = t(key);
        }
    });
}
