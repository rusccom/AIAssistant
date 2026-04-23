import { RealtimeLogger } from '../shared/realtime-logger';
import { createUniversalExecute } from '../shared/universal-execute';
import { isGeminiSessionOpen } from './gemini-session-lifecycle';

interface FunctionCallLike {
  args?: Record<string, unknown>;
  id?: string;
  name: string;
}

interface FunctionResponseLike {
  id?: string;
  name: string;
  response: { result: unknown };
}

interface ToolCallHandlerContext {
  canSend: () => boolean;
  execute: ReturnType<typeof createUniversalExecute>;
  getSession: () => any;
  getStateId: () => string;
  hasPendingTransition: () => boolean;
  logger: RealtimeLogger;
  onPendingTransition: () => Promise<void>;
}

const getFunctionCalls = (message: any): FunctionCallLike[] => {
  return message.toolCall?.functionCalls || [];
};

const executeFunctionCall = async (
  execute: ReturnType<typeof createUniversalExecute>,
  call: FunctionCallLike
): Promise<FunctionResponseLike> => ({
  id: call.id,
  name: call.name,
  response: {
    result: await execute((call.args || {}) as Record<string, unknown>, call.name)
  }
});

const buildFunctionResponses = (
  execute: ReturnType<typeof createUniversalExecute>,
  calls: FunctionCallLike[]
) => {
  return Promise.all(calls.map((call) => executeFunctionCall(execute, call)));
};

const logToolResponseSent = (
  context: ToolCallHandlerContext,
  responses: FunctionResponseLike[]
) => {
  context.logger.info('tool', 'response_sent', {
    stateId: context.getStateId(),
    toolNames: responses.map((response) => response.name)
  });
};

export const createGeminiToolCallHandler = (
  context: ToolCallHandlerContext
) => async (message: any) => {
  const functionCalls = getFunctionCalls(message);
  if (functionCalls.length === 0) return false;

  const functionResponses = await buildFunctionResponses(
    context.execute,
    functionCalls
  );
  const session = context.getSession();
  if (!context.canSend() || !isGeminiSessionOpen(session)) return false;

  logToolResponseSent(context, functionResponses);
  session.sendToolResponse({ functionResponses });
  if (!context.hasPendingTransition()) return false;

  await context.onPendingTransition();
  return true;
};
