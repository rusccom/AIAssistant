export interface SpinnerConfig {
    size?: 'small' | 'medium' | 'large';
    color?: string;
    text?: string;
    overlay?: boolean;
}

type ButtonSpinnerState = {
    disabled: boolean;
    html: string;
    spinner: LoadingSpinner;
};

const BUTTON_SPINNER_STATE = new WeakMap<HTMLButtonElement, ButtonSpinnerState>();

export class LoadingSpinner {
    private readonly config: SpinnerConfig;
    private readonly element: HTMLElement;

    constructor(config: SpinnerConfig = {}) {
        this.config = config;
        this.element = this.createElement();
    }

    public show(parent?: HTMLElement): void {
        if (!this.element.parentNode) {
            (parent || document.body).appendChild(this.element);
        }

        this.element.classList.add('ui-spinner--visible');
    }

    public hide(): void {
        this.element.classList.remove('ui-spinner--visible');
    }

    public destroy(): void {
        this.element.remove();
    }

    public static showGlobal(text = 'Loading...'): LoadingSpinner {
        const spinner = new LoadingSpinner({
            size: 'large',
            text,
            overlay: true
        });

        spinner.show();
        return spinner;
    }

    public static addToButton(button: HTMLButtonElement, text?: string): void {
        if (BUTTON_SPINNER_STATE.has(button)) {
            return;
        }

        const spinner = new LoadingSpinner({ size: 'small' });
        spinner.element.classList.add('btn-spinner');

        BUTTON_SPINNER_STATE.set(button, {
            disabled: button.disabled,
            html: button.innerHTML,
            spinner
        });

        button.disabled = true;

        if (text) {
            button.textContent = text;
        }

        button.prepend(spinner.element);
        spinner.show();
    }

    public static removeFromButton(button: HTMLButtonElement): void {
        const state = BUTTON_SPINNER_STATE.get(button);

        if (!state) {
            return;
        }

        state.spinner.destroy();
        button.disabled = state.disabled;
        button.innerHTML = state.html;
        BUTTON_SPINNER_STATE.delete(button);
    }

    private createElement(): HTMLElement {
        const spinner = document.createElement('div');
        const ring = document.createElement('div');
        const classes = ['ui-spinner', getSpinnerSizeClass(this.config.size)];

        if (this.config.overlay) {
            classes.push('ui-spinner--overlay');
        }

        spinner.className = classes.join(' ');
        ring.className = 'ui-spinner__ring';

        if (this.config.color) {
            spinner.style.setProperty('--ui-spinner-accent', this.config.color);
        }

        spinner.appendChild(ring);

        if (this.config.text) {
            const text = document.createElement('div');
            text.className = 'ui-spinner__text';
            text.textContent = this.config.text;
            spinner.appendChild(text);
        }

        return spinner;
    }
}

function getSpinnerSizeClass(size: SpinnerConfig['size']): string {
    if (size === 'small') {
        return 'ui-spinner--small';
    }

    if (size === 'large') {
        return 'ui-spinner--large';
    }

    return 'ui-spinner--medium';
}
