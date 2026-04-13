import { Modality, ThinkingLevel } from '@google/genai';
import {
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';

const THINKING_LEVEL_MAP = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH
} as const;

const normalizeParameters = (parameters?: Record<string, unknown>) => {
  if (!parameters) return undefined;
  const properties = parameters.properties;
  const hasProperties =
    properties != null &&
    typeof properties === 'object' &&
    Object.keys(properties as Record<string, unknown>).length > 0;

  return hasProperties ? parameters : undefined;
};

const buildTools = (state: SessionStateDefinition) => {
  return [
    {
      functionDeclarations: state.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: normalizeParameters(tool.function.parameters)
      }))
    }
  ];
};

const buildSpeechConfig = (voice: string) => {
  return {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
  };
};

const normalizeThinkingConfig = (
  state: SessionStateDefinition
): { thinkingBudget?: number; thinkingLevel?: ThinkingLevel } | undefined => {
  const thinkingConfig = state.geminiThinkingConfig;
  if (!thinkingConfig) {
    return undefined;
  }

  const normalized: { thinkingBudget?: number; thinkingLevel?: ThinkingLevel } = {};
  if (typeof thinkingConfig.thinkingBudget === 'number') {
    normalized.thinkingBudget = thinkingConfig.thinkingBudget;
  }
  if (thinkingConfig.thinkingLevel) {
    normalized.thinkingLevel = THINKING_LEVEL_MAP[thinkingConfig.thinkingLevel];
  }

  return normalized;
};

export const buildConnectConfig = (
  input: StartRuntimeInput,
  state: SessionStateDefinition,
  resumeHandle?: string | null
) => {
  const thinkingConfig = normalizeThinkingConfig(state);

  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction: state.instructions,
    tools: buildTools(state),
    speechConfig: buildSpeechConfig(input.sessionConfig.voice),
    sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    ...(thinkingConfig ? { thinkingConfig } : {})
  };
};
