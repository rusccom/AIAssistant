import { resolveApiHost } from './universal-execute';
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
  const response = await fetch(`${resolveApiHost(config)}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostname: config.hostname || window.location.hostname
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token and config: ${response.statusText}`);
  }

  const data = await response.json();
  return assertSessionConfig(data);
};
