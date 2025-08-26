/**
 * Простая система предотвращения FOUC
 * Скрывает body до загрузки стилей, затем плавно показывает
 */

function showContent(): void {
    document.body.classList.add('loaded');
}

function checkStylesLoaded(): boolean {
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.className = 'btn';
    document.body.appendChild(testElement);
    
    try {
        const styles = window.getComputedStyle(testElement);
        const hasStyles = styles.padding !== '0px' || styles.borderRadius !== '0px';
        return hasStyles;
    } finally {
        document.body.removeChild(testElement);
    }
}

function waitForStyles(): void {
    if (checkStylesLoaded()) {
        showContent();
        return;
    }

    const checkLoop = () => {
        if (checkStylesLoaded()) {
            showContent();
        } else {
            requestAnimationFrame(checkLoop);
        }
    };
    
    requestAnimationFrame(checkLoop);
    
    // Fallback: показываем контент через 300ms в любом случае
    setTimeout(showContent, 300);
}

/**
 * Инициализирует простую защиту от FOUC
 */
export function initSimpleFouc(): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForStyles);
    } else {
        waitForStyles();
    }
}
