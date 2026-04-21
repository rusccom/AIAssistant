export function closeLayer(element: HTMLElement): void {
    setElementVisible(element, false);
    unlockBodyScroll();
}

export function openLayer(element: HTMLElement): void {
    setElementVisible(element, true, 'flex');
    lockBodyScroll();
}

export function setBodyScrollLocked(locked: boolean): void {
    if (locked) {
        lockBodyScroll();
        return;
    }

    unlockBodyScroll();
}

export function setElementVisible(
    element: HTMLElement,
    visible: boolean,
    displayValue = 'block'
): void {
    element.hidden = !visible;
    element.style.display = visible ? displayValue : 'none';
}

function lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
}

function unlockBodyScroll(): void {
    document.body.style.overflow = '';
}
