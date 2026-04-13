interface GeminiMessagePart {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
}

interface GeminiMessageLike {
  serverContent?: { modelTurn?: { parts?: GeminiMessagePart[] }; interrupted?: boolean };
  toolCall?: { functionCalls?: Array<{ name: string }> };
}

const getParts = (message: GeminiMessageLike) => {
  return message.serverContent?.modelTurn?.parts || [];
};

const getTextPreview = (parts: GeminiMessagePart[]) => {
  const text = parts.find((part) => typeof part.text === 'string')?.text;
  return text ? text.slice(0, 120) : null;
};

export const summarizeGeminiMessage = (message: GeminiMessageLike) => {
  const parts = getParts(message);
  const toolNames = (message.toolCall?.functionCalls || []).map((call) => call.name);

  return {
    hasAudio: parts.some((part) => typeof part.inlineData?.data === 'string'),
    hasText: parts.some((part) => typeof part.text === 'string' && part.text.length > 0),
    interrupted: Boolean(message.serverContent?.interrupted),
    textPreview: getTextPreview(parts),
    toolCallCount: toolNames.length,
    toolNames
  };
};
