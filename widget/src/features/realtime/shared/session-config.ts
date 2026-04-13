import { resolveApiHost } from './universal-execute';
import {
  logWidgetError,
  logWidgetEvent,
  summarizeStateMachine
} from './realtime-logger';
import { ServerSessionConfig, WidgetConfig } from './realtime-session.types';

const assertSessionConfig = (data: any): ServerSessionConfig => {
  if (!data?.token || !data?.instructions || !Array.isArray(data?.tools)) {
    throw new Error('Token, instructions, or tools were not provided by the server.');
  }

  if (!data?.stateMachine || !Array.isArray(data.stateMachine.states)) {
    throw new Error('State machine bootstrap was not provided by the server.');
  }

  return {
    provider: data.provider || 'openai',
    transport: data.transport || 'openai-webrtc',
    token: data.token,
    expiresAt: data.expiresAt ?? data.expires_at ?? null,
    instructions: data.instructions,
    tools: data.tools,
    voice: data.voice || 'alloy',
    model: data.model || 'gpt-realtime',
    currentStateId: data.currentStateId || null,
    stateMachine: data.stateMachine
  };
};

export const fetchSessionConfig = async (
  config: WidgetConfig
): Promise<ServerSessionConfig> => {
  const hostname = config.hostname || window.location.hostname;
  const apiHost = resolveApiHost(config);
  const startedAt = Date.now();

  logWidgetEvent(
    'session',
    'config_requested',
    { apiHost, hostname },
    { traceId: config.traceId }
  );

  try {
    const response = await fetch(`${apiHost}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname, traceId: config.traceId || null })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token and config: ${response.statusText}`);
    }

    const data = await response.json();
    const sessionConfig = assertSessionConfig(data);

    logWidgetEvent(
      'session',
      'config_received',
      {
        currentStateId: sessionConfig.currentStateId || null,
        durationMs: Date.now() - startedAt,
        transport: sessionConfig.transport,
        voice: sessionConfig.voice,
        stateMachine: summarizeStateMachine(sessionConfig.stateMachine)
      },
      {
        traceId: config.traceId,
        provider: sessionConfig.provider,
        model: sessionConfig.model
      }
    );

    return sessionConfig;
  } catch (error) {
    logWidgetError(
      'session',
      'config_failed',
      {
        hostname,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error)
      },
      { traceId: config.traceId }
    );
    throw error;
  }
};
