import { LocalStateController } from './state-machine';
import {
  RealtimeLogger,
  summarizeResult
} from './realtime-logger';
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
  stateController: LocalStateController,
  logger?: RealtimeLogger,
  getTraceContext?: () => Record<string, unknown>
) => {
  return async (params: Record<string, unknown>, toolName: string) => {
    const startedAt = Date.now();
    const currentStateId = stateController.getCurrentState().id;
    const traceContext = getTraceContext?.() || {};

    logger?.info('tool', 'execute_started', {
      currentStateId,
      toolName,
      params,
      ...traceContext
    });

    try {
      if (toolName === 'transition_state') {
        const result = stateController.scheduleTransition(
          params.nextStateId as string | undefined,
          params.reason as string | undefined
        );
        logger?.info('tool', 'execute_finished', {
          currentStateId,
          toolName,
          durationMs: Date.now() - startedAt,
          result: summarizeResult(result)
        });
        return result;
      }

      const apiHost = resolveApiHost(config);
      const enhancedParams = {
        ...params,
        hostname: config.hostname || window.location.hostname,
        traceId: config.traceId || null,
        stateId: currentStateId,
        ...traceContext
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
      const output = result.success
        ? result.response
        : result.response || `Error executing ${toolName}.`;

      logger?.info('tool', 'execute_finished', {
        currentStateId,
        toolName,
        durationMs: Date.now() - startedAt,
        success: Boolean(result.success),
        statusCode: response.status,
        result: summarizeResult(output)
      });

      return output;
    } catch (error) {
      logger?.error('tool', 'execute_failed', {
        currentStateId,
        toolName,
        durationMs: Date.now() - startedAt,
        ...traceContext,
        message: error instanceof Error ? error.message : String(error)
      });
      console.error(`Widget tool execution failed for ${toolName}:`, error);
      return `Sorry, there was an error executing ${toolName}.`;
    }
  };
};
