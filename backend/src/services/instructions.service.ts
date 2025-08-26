/**
 * Сервис для генерации инструкций AI
 * Переносим всю логику с клиента на сервер
 */

export const generateAgentInstructions = (config: any): string => {
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
${config.conversationStates ? `\n# Conversation States\n${JSON.stringify(config.conversationStates, null, 2)}` : ''}
`.trim();
};

/**
 * Подготавливает полную конфигурацию для виджета
 * Теперь без tools - они загружаются из bot-functions
 */
export const prepareWidgetConfig = (botConfig: any) => {
    return {
        // Готовые инструкции (виджет не формирует их сам)
        instructions: generateAgentInstructions(botConfig),
        
        // Настройки голоса
        voice: botConfig.voice || 'alloy',
        
        // Другие готовые настройки
        model: 'gpt-4o-realtime-preview-2025-06-03',
        modalities: ['text', 'audio'],
        
        // Сырая конфигурация (если нужна виджету)
        rawConfig: botConfig
    };
}; 