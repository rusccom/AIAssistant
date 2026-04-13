import { startGeminiRuntime } from '../gemini/gemini-runtime';
import { startOpenAIRuntime } from '../openai/openai-runtime';
import {
  createRealtimeLogger,
  summarizeStateMachine
} from './realtime-logger';
import { StartRuntimeInput } from './realtime-session.types';

export const startRealtimeRuntime = (input: StartRuntimeInput) => {
  const logger = createRealtimeLogger({
    traceId: input.config.traceId,
    provider: input.sessionConfig.provider,
    model: input.sessionConfig.model,
    transport: input.sessionConfig.transport
  });

  logger.info('runtime', 'selected', {
    currentStateId: input.sessionConfig.currentStateId || null,
    stateMachine: summarizeStateMachine(input.sessionConfig.stateMachine)
  });

  return input.sessionConfig.provider === 'gemini'
    ? startGeminiRuntime(input, logger)
    : startOpenAIRuntime(input, logger);
};
