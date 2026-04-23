import { RealtimeLogger } from '../shared/realtime-logger';
import {
  INITIAL_ASSISTANT_PROMPT,
  notifyRuntimeStatus
} from '../shared/initial-assistant-turn';
import { StartRuntimeInput } from '../shared/realtime-session.types';
import { isGeminiSessionOpen } from './gemini-session-lifecycle';

interface GeminiStartupTurnContext {
  getSession: () => any;
  input: StartRuntimeInput;
  logger: RealtimeLogger;
}

export const sendGeminiStartupTurn = (
  context: GeminiStartupTurnContext
) => {
  const session = context.getSession();
  if (!isGeminiSessionOpen(session)) return false;

  notifyRuntimeStatus(context.input, 'assistant_starting');
  context.logger.info('startup', 'initial_prompt_sent', {
    provider: 'gemini'
  });
  session.sendRealtimeInput({ text: INITIAL_ASSISTANT_PROMPT });
  return true;
};
