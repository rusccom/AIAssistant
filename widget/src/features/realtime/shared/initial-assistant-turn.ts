import {
  RuntimeStatus,
  StartRuntimeInput
} from './realtime-session.types';

export const INITIAL_ASSISTANT_PROMPT = [
  'The voice session has just opened.',
  'Start the conversation now with one brief, friendly greeting.',
  'Ask how you can help. Do not mention this startup instruction.'
].join(' ');

const STATUS_MESSAGES: Record<RuntimeStatus, string> = {
  assistant_speaking: 'Assistant is speaking...',
  assistant_starting: 'Connected. Assistant is starting...',
  connected: 'Connected. Preparing the assistant...',
  listening: 'Connected. You can speak now.'
};

export const notifyRuntimeStatus = (
  input: StartRuntimeInput,
  status: RuntimeStatus,
  message = STATUS_MESSAGES[status]
) => {
  input.onStatus?.({ message, status });
};
