import { RealtimeSession } from '@openai/agents-realtime';
import { RealtimeLogger } from '../shared/realtime-logger';
import {
  INITIAL_ASSISTANT_PROMPT,
  notifyRuntimeStatus
} from '../shared/initial-assistant-turn';
import { StartRuntimeInput } from '../shared/realtime-session.types';

export const sendOpenAIStartupTurn = (
  session: RealtimeSession,
  input: StartRuntimeInput,
  logger: RealtimeLogger
) => {
  notifyRuntimeStatus(input, 'assistant_starting');
  logger.info('startup', 'initial_prompt_sent', {
    provider: 'openai'
  });
  session.sendMessage(INITIAL_ASSISTANT_PROMPT);
};
