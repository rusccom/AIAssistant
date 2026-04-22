import { captureExternalRealtimeLog } from '../realtime/shared/realtime-logger';
import { WidgetConfig } from '../realtime/shared/realtime-session.types';

const WIDGET_SCRIPT_NAME = 'widget.js';

const getScriptUrl = (script: HTMLScriptElement) => {
  return new URL(script.src, window.location.href);
};

const isWidgetScript = (script: HTMLScriptElement) => {
  return script.src.includes(WIDGET_SCRIPT_NAME);
};

const getFallbackScript = () => {
  const scripts = Array.from(document.getElementsByTagName('script'));
  const widgetScripts = scripts.filter(isWidgetScript);
  return widgetScripts[widgetScripts.length - 1] || null;
};

const getCurrentWidgetScript = () => {
  const currentScript = document.currentScript;
  if (currentScript instanceof HTMLScriptElement && isWidgetScript(currentScript)) {
    return currentScript;
  }

  return getFallbackScript();
};

const readQueryParam = (script: HTMLScriptElement, name: string) => {
  return getScriptUrl(script).searchParams.get(name)?.trim() || '';
};

const readRequiredQueryParam = (script: HTMLScriptElement, name: string) => {
  const value = readQueryParam(script, name);
  if (value) {
    return value;
  }

  captureExternalRealtimeLog('error', 'widget', 'missing_query_param', {
    message: `Widget script is missing required "${name}" query parameter.`,
    param: name
  });
  return null;
};

export const resolveEmbedBootstrap = (): WidgetConfig | null => {
  const script = getCurrentWidgetScript();
  if (!script?.src) {
    return null;
  }

  const scriptUrl = getScriptUrl(script);
  const hostname = readRequiredQueryParam(script, 'hostname');
  const embedToken = readRequiredQueryParam(script, 'embed');
  if (!hostname || !embedToken) {
    return null;
  }

  return {
    apiHost: scriptUrl.origin,
    hostname,
    embedToken
  };
};
