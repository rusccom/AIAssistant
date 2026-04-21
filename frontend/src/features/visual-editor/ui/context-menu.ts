type ContextAction = 'create-connection' | 'delete-state' | 'edit-state';

interface ContextMenuCallbacks {
    onAction: (action: ContextAction, stateId: string) => void;
}

export class ContextMenuController {
    private activeStateId: string | null = null;
    private outsideClickHandler?: (event: MouseEvent) => void;

    public constructor(
        private readonly root: HTMLElement,
        private readonly callbacks: ContextMenuCallbacks
    ) {
        this.root.addEventListener('click', (event) => this.handleClick(event));
    }

    public hide(): void {
        this.root.style.display = 'none';
        this.activeStateId = null;

        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }

    public show(event: MouseEvent, stateId: string): void {
        event.preventDefault();
        this.activeStateId = stateId;
        this.root.style.display = 'block';
        this.root.style.left = `${event.clientX}px`;
        this.root.style.top = `${event.clientY}px`;
        this.updateItemVisibility(stateId);
        this.outsideClickHandler = (clickEvent) => {
            if (!this.root.contains(clickEvent.target as Node)) {
                this.hide();
            }
        };
        window.setTimeout(() => document.addEventListener('click', this.outsideClickHandler!), 0);
    }

    private handleClick(event: Event): void {
        const target = event.target as HTMLElement | null;
        const action = target?.dataset.action as ContextAction | undefined;
        if (!action || !this.activeStateId) {
            return;
        }

        this.callbacks.onAction(action, this.activeStateId);
        this.hide();
    }

    private updateItemVisibility(stateId: string): void {
        const isStart = stateId === 'start';
        const isEnd = stateId === 'end';
        this.toggleItem('create-connection', !isEnd);
        this.toggleItem('edit-state', !isStart && !isEnd);
        this.toggleItem('delete-state', !isStart && !isEnd);
    }

    private toggleItem(action: ContextAction, visible: boolean): void {
        const item = this.root.querySelector<HTMLElement>(`[data-action="${action}"]`);
        if (item) {
            item.style.display = visible ? 'block' : 'none';
        }
    }
}
