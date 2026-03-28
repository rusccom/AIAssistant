import OpenAI from 'openai';
import {
  BotToolDefinition,
  CreatedRealtimeSession,
  PreparedRealtimeConfig,
  RealtimeProvider
} from '../shared/realtime.types';

const buildOpenAITools = (tools: BotToolDefinition[]) =>
  tools.map((tool) => ({
    type: tool.type,
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  }));

const createClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey });
};

const createSessionConfig = (config: PreparedRealtimeConfig) => ({
  model: config.model,
  modalities: ['text', 'audio'],
  voice: config.voice,
  instructions: config.instructions,
  tools: buildOpenAITools(config.tools)
});

const createSession = async (
  config: PreparedRealtimeConfig
): Promise<CreatedRealtimeSession> => {
  const client = createClient();
  const session = await client.beta.realtime.sessions.create(
    createSessionConfig(config) as any
  );

  return {
    provider: 'openai',
    transport: 'openai-webrtc',
    token: session.client_secret.value,
    expiresAt: session.client_secret.expires_at,
    model: config.model,
    voice: config.voice,
    instructions: config.instructions,
    tools: config.tools
  };
};

export const openaiRealtimeProvider: RealtimeProvider = {
  id: 'openai',
  createSession
};
