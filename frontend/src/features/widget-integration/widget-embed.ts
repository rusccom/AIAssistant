const WIDGET_LOADER_ID = 'ai-widget-loader';

interface WidgetWindow extends Window {
  AIWidget?: {
    destroy?: (message?: string) => void;
  };
}

const escapeHtmlAttribute = (value: string) => {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};

const fallbackCopyText = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) {
    throw new Error('Copy command failed.');
  }
};

export const buildWidgetEmbedSnippet = (widgetScriptUrl: string) => {
  return `<script src="${escapeHtmlAttribute(widgetScriptUrl)}"></script>`;
};

export const copyWidgetEmbedSnippet = async (widgetScriptUrl: string) => {
  const snippet = buildWidgetEmbedSnippet(widgetScriptUrl);
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(snippet);
    return snippet;
  }

  fallbackCopyText(snippet);
  return snippet;
};

export const openWidgetPreview = (widgetScriptUrl: string) => {
  const widgetWindow = window as WidgetWindow;
  widgetWindow.AIWidget?.destroy?.('Widget reloaded from dashboard.');
  document.getElementById(WIDGET_LOADER_ID)?.remove();

  const script = document.createElement('script');
  script.src = widgetScriptUrl;
  script.id = WIDGET_LOADER_ID;
  document.head.appendChild(script);
};
