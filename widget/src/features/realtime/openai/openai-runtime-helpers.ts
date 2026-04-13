import {
  parseSerializedJson,
  RealtimeLogger
} from '../shared/realtime-logger';

export const getAgentName = (agent: { name?: string }) => {
  return agent.name || 'assistant';
};

export const getToolName = (tool: { name?: string }) => {
  return tool.name || 'unknown';
};

export const getToolCallArguments = (toolCall: Record<string, unknown>) => {
  if (!('arguments' in toolCall)) {
    return null;
  }

  const value = toolCall.arguments;
  return typeof value === 'string' ? parseSerializedJson(value) : value;
};

const shouldLogRawEvent = (eventType: string) => {
  return !['audio', 'audio_transcript_delta', 'item_update', 'history_updated'].includes(eventType);
};

export const logTransportEvent = (
  logger: RealtimeLogger,
  event: { type: string; [key: string]: any }
) => {
  if (!shouldLogRawEvent(event.type)) {
    return;
  }

  logger.info('transport', 'raw_event', { type: event.type, event });
};
