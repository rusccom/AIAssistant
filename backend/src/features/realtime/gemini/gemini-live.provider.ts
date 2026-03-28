import { GoogleGenAI } from '@google/genai';
import {
  CreatedRealtimeSession,
  PreparedRealtimeConfig,
  RealtimeProvider
} from '../shared/realtime.types';

const SESSION_MINUTES = 30;
const addMinutes = (minutes: number): string =>
  new Date(Date.now() + minutes * 60_000).toISOString();

const createClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' }
  });
};

const createTokenConfig = (config: PreparedRealtimeConfig) => ({
  uses: 0,
  expireTime: addMinutes(SESSION_MINUTES),
  newSessionExpireTime: addMinutes(SESSION_MINUTES),
  liveConnectConstraints: {
    model: config.model
  }
});

const createSession = async (
  config: PreparedRealtimeConfig
): Promise<CreatedRealtimeSession> => {
  const client = createClient();
  const token = await client.authTokens.create({
    config: createTokenConfig(config) as any
  });

  if (!token.name) {
    throw new Error('Gemini auth token response is missing token name');
  }

  return {
    provider: 'gemini',
    transport: 'gemini-live',
    token: token.name,
    expiresAt: addMinutes(SESSION_MINUTES),
    model: config.model,
    voice: config.voice,
    instructions: config.instructions,
    tools: config.tools
  };
};

export const geminiLiveProvider: RealtimeProvider = {
  id: 'gemini',
  createSession
};
