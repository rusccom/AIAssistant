import { LocalStateController } from './state-machine';
import { WidgetConfig } from './realtime-session.types';

const resolveDefaultApiHost = () => {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.host}`;
};

export const resolveApiHost = (config: WidgetConfig) => {
  return config.apiHost || resolveDefaultApiHost();
};

export const createUniversalExecute = (
  config: WidgetConfig,
  stateController: LocalStateController
) => {
  return async (params: Record<string, unknown>, toolName: string) => {
    try {
      if (toolName === 'transition_state') {
        return stateController.scheduleTransition(params.nextStateId as string | undefined);
      }

      const apiHost = resolveApiHost(config);
      const enhancedParams = {
        ...params,
        hostname: config.hostname || window.location.hostname
      };

      const response = await fetch(`${apiHost}/api/bot-execute/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedParams)
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ${toolName}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.response : result.response || `Error executing ${toolName}.`;
    } catch (error) {
      console.error(`Widget tool execution failed for ${toolName}:`, error);
      return `Sorry, there was an error executing ${toolName}.`;
    }
  };
};
