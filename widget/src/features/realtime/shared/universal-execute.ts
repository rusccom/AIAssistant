import { LocalStateController } from './state-machine';
import {
  RealtimeLogger,
  summarizeResult
} from './realtime-logger';
import { WidgetConfig } from './realtime-session.types';
import { findTransitionByToolName } from './state-transition-tools';
import { createLocalCartToolController } from '../../cart/local-cart-tools';
import { createProductContextController } from '../../product-context/product-context-controller';

const resolveDefaultApiHost = () => {
  return `${window.location.protocol}//${window.location.host}`;
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
  const localCartTools = createLocalCartToolController(config.hostname);
  const productContext = createProductContextController();

  return async (params: Record<string, unknown>, toolName: string) => {
    const startedAt = Date.now();
    const currentState = stateController.getCurrentState();
    const currentStateTrace = stateController.getCurrentStateTrace();
    const pendingTransition = stateController.getPendingTransition();
    const currentStateId = currentState.id;
    const traceContext = getTraceContext?.() || {};
    const transition = findTransitionByToolName(currentState, toolName);

    logger?.info('tool', 'execute_started', {
      currentStateId,
      stateEntryId: currentStateTrace.entryId,
      stateId: currentStateId,
      stateTrace: currentStateTrace,
      toolName,
      transitionId: pendingTransition?.id || currentStateTrace.transitionId || null,
      params,
      ...traceContext
    });

    try {
      const localResult = localCartTools.executeTool(toolName, params);
      if (localResult) {
        logger?.info('tool', 'execute_finished', {
          currentStateId,
          toolName,
          durationMs: Date.now() - startedAt,
          stateEntryId: currentStateTrace.entryId,
          stateId: currentStateId,
          transitionId: pendingTransition?.id || null,
          result: summarizeResult(localResult)
        });
        return localResult;
      }

      if (transition) {
        const result = stateController.scheduleTransition({
          instructionVersion: traceContext.instructionVersion as string | null,
          nextStateId: transition.next_step,
          reason: params.reason as string | undefined,
          source: 'tool_execute',
          toolName,
          turnId: traceContext.turnId as string | null
        });
        logger?.info('tool', 'execute_finished', {
          currentStateId,
          toolName,
          durationMs: Date.now() - startedAt,
          stateEntryId: currentStateTrace.entryId,
          stateId: currentStateId,
          transitionId:
            stateController.getPendingTransition()?.id
            || currentStateTrace.transitionId
            || null,
          result: summarizeResult(result)
        });
        return result;
      }

      const apiHost = resolveApiHost(config);
      const cartSnapshot = localCartTools.getCartSnapshot();
      const enhancedParams = productContext.enhanceParams(toolName, {
        ...params,
        ...(toolName === 'place_order' ? { cart: cartSnapshot } : {}),
        hostname: config.hostname,
        embedToken: config.embedToken,
        traceId: config.traceId || null,
        stateId: currentStateId,
        stateEntryId: currentStateTrace.entryId,
        transitionId: pendingTransition?.id || null,
        ...traceContext
      });

      if (toolName === 'place_order' && !cartSnapshot.items.length) {
        return {
          success: false,
          response: 'Cart is empty. Add items before placing the order.',
          error: 'EMPTY_CART'
        };
      }

      const response = await fetch(`${apiHost}/api/bot-execute/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedParams)
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ${toolName}: ${response.statusText}`);
      }

      const result = await response.json();
      if (toolName === 'place_order' && result.success) {
        localCartTools.clearCart();
      }
      localCartTools.captureToolResult(toolName, result);
      productContext.captureToolResult(toolName, result);

      logger?.info('tool', 'execute_finished', {
        currentStateId,
        toolName,
        durationMs: Date.now() - startedAt,
        success: Boolean(result.success),
        statusCode: response.status,
        stateEntryId: currentStateTrace.entryId,
        stateId: currentStateId,
        transitionId: pendingTransition?.id || null,
        result: summarizeResult(result)
      });

      return result;
    } catch (error) {
      logger?.error('tool', 'execute_failed', {
        currentStateId,
        toolName,
        durationMs: Date.now() - startedAt,
        stateEntryId: currentStateTrace.entryId,
        stateId: currentStateId,
        transitionId: pendingTransition?.id || null,
        ...traceContext,
        message: error instanceof Error ? error.message : String(error)
      });
      return `Sorry, there was an error executing ${toolName}.`;
    }
  };
};
