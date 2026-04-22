export interface WidgetShell {
  destroy(): void;
  isDestroyed: boolean;
  statusElement: HTMLParagraphElement;
  talkButton: HTMLButtonElement;
}

interface CreateWidgetShellOptions {
  hostname: string;
  onRequestClose: () => void;
  secondaryPanel?: HTMLElement | null;
}

const HOST_ATTRIBUTE = 'data-ai-assistant-widget-root';

let cleanupActiveShell: (() => void) | null = null;

const createHost = () => {
  const host = document.createElement('div');
  host.setAttribute(HOST_ATTRIBUTE, 'true');
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483646';
  host.style.pointerEvents = 'none';
  return host;
};

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      color-scheme: light;
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.58);
      backdrop-filter: blur(8px);
      pointer-events: auto;
      overscroll-behavior: contain;
    }

    .panel {
      width: min(420px, calc(100vw - 32px));
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 24px;
      box-shadow: 0 32px 80px rgba(15, 23, 42, 0.28);
      color: #0f172a;
      overflow: hidden;
    }

    .panel[data-layout="wide"] {
      width: min(920px, calc(100vw - 32px));
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 24px 24px 16px;
    }

    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .subtitle {
      margin: 6px 0 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.5;
    }

    .close {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      color: #0f172a;
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .body {
      display: flex;
      gap: 18px;
      align-items: stretch;
      padding: 0 24px 24px;
    }

    .main {
      flex: 1 1 0;
      min-width: 0;
    }

    .secondary {
      width: min(340px, 100%);
      min-width: 0;
      display: flex;
    }

    .status {
      min-height: 72px;
      margin: 0 0 20px;
      padding: 16px;
      border-radius: 16px;
      background: #eff6ff;
      color: #1e3a8a;
      font-size: 14px;
      line-height: 1.6;
    }

    .talkButton {
      width: 100%;
      border: none;
      border-radius: 16px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      box-shadow: 0 16px 28px rgba(37, 99, 235, 0.26);
    }

    .talkButton:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 20px 34px rgba(37, 99, 235, 0.3);
    }

    .talkButton:disabled {
      opacity: 0.72;
      cursor: wait;
      transform: none;
      box-shadow: none;
    }

    @media (max-width: 860px) {
      .body {
        flex-direction: column;
      }

      .secondary {
        width: 100%;
      }
    }
  `;
  return style;
};

const createPanel = (
  hostname: string,
  secondaryPanel?: HTMLElement | null
) => {
  const overlay = document.createElement('div');
  const panel = document.createElement('section');
  const header = document.createElement('div');
  const body = document.createElement('div');
  const main = document.createElement('div');
  const textWrap = document.createElement('div');
  const title = document.createElement('h1');
  const subtitle = document.createElement('p');
  const closeButton = document.createElement('button');
  const statusElement = document.createElement('p');
  const talkButton = document.createElement('button');

  overlay.className = 'overlay';
  panel.className = 'panel';
  header.className = 'header';
  body.className = 'body';
  main.className = 'main';
  title.className = 'title';
  subtitle.className = 'subtitle';
  closeButton.className = 'close';
  statusElement.className = 'status';
  talkButton.className = 'talkButton';
  panel.dataset.layout = secondaryPanel ? 'wide' : 'compact';

  title.textContent = 'Voice Assistant';
  subtitle.textContent = `Connected to ${hostname}`;
  closeButton.type = 'button';
  closeButton.textContent = 'x';
  closeButton.setAttribute('aria-label', 'Close assistant');
  statusElement.setAttribute('aria-live', 'polite');
  talkButton.type = 'button';

  textWrap.append(title, subtitle);
  header.append(textWrap, closeButton);
  main.append(statusElement, talkButton);
  body.appendChild(main);
  if (secondaryPanel) {
    const side = document.createElement('div');
    side.className = 'secondary';
    side.appendChild(secondaryPanel);
    body.appendChild(side);
  }
  panel.append(header, body);
  overlay.appendChild(panel);

  return { closeButton, overlay, panel, statusElement, talkButton };
};

const attachCloseHandlers = (
  overlay: HTMLDivElement,
  panel: HTMLElement,
  closeButton: HTMLButtonElement,
  onRequestClose: () => void
) => {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      onRequestClose();
    }
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  closeButton.addEventListener('click', () => {
    onRequestClose();
  });
};

const attachEscapeHandler = (onRequestClose: () => void) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onRequestClose();
    }
  };

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
};

export const createWidgetShell = (
  options: CreateWidgetShellOptions
): WidgetShell => {
  cleanupActiveShell?.();

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const { closeButton, overlay, panel, statusElement, talkButton } = createPanel(
    options.hostname,
    options.secondaryPanel
  );
  const cleanupKeyHandler = attachEscapeHandler(options.onRequestClose);

  shadowRoot.append(createStyle(), overlay);
  attachCloseHandlers(overlay, panel, closeButton, options.onRequestClose);
  document.body.appendChild(host);

  let isDestroyed = false;

  const destroy = () => {
    if (isDestroyed) {
      return;
    }

    isDestroyed = true;
    cleanupKeyHandler();
    host.remove();
    if (cleanupActiveShell === destroy) {
      cleanupActiveShell = null;
    }
  };

  cleanupActiveShell = destroy;

  return {
    destroy,
    get isDestroyed() {
      return isDestroyed;
    },
    statusElement,
    talkButton
  };
};
