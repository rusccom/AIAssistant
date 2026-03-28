export const generateBaseAgentInstructions = (config: any): string => {
  return `
# Personality and Tone
## Identity
${config.identity || ''}

## Task
${config.task || ''}

## Demeanor
${config.demeanor || ''}

## Tone
${config.tone || ''}

## Level of Enthusiasm
${config.levelOfEnthusiasm || ''}

## Level of Formality
${config.formality || ''}

## Level of Emotion
${config.levelOfEmotion || ''}

## Filler Words
${config.fillerWords || ''}

## Pacing
${config.pacing || ''}

## Other details
${config.otherDetails || ''}

# Instructions
${config.instructions || ''}
`.trim();
};

export const generateAgentInstructions = (config: any): string => {
  return `
${generateBaseAgentInstructions(config)}
${config.conversationStates ? `\n# Conversation States\n${JSON.stringify(config.conversationStates, null, 2)}` : ''}
`.trim();
};

export const prepareWidgetConfig = (botConfig: any) => {
  return {
    provider: botConfig.provider || 'openai',
    instructions: generateAgentInstructions(botConfig),
    voice: botConfig.voice || 'alloy',
    model: botConfig.model || 'gpt-realtime',
    modalities: ['text', 'audio'],
    rawConfig: botConfig
  };
};
