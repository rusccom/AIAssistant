import {
  ConversationStateDefinition,
  ConversationTransition,
  ReasoningMode
} from './state-machine.types';

const REASONING_MODES: ReasoningMode[] = ['inherit', 'fast', 'balanced', 'deep'];

const isReasoningMode = (value: unknown): value is ReasoningMode => {
  return typeof value === 'string' && REASONING_MODES.includes(value as ReasoningMode);
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeTransitions = (value: unknown): ConversationTransition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const transitions: ConversationTransition[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const nextStep = typeof (item as any).next_step === 'string'
      ? (item as any).next_step.trim()
      : '';

    if (!nextStep) {
      return;
    }

    transitions.push({
      next_step: nextStep,
      condition: typeof (item as any).condition === 'string'
        ? (item as any).condition.trim()
        : undefined
    });
  });

  return transitions;
};

export const parseConversationStates = (value: unknown): ConversationStateDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const states: ConversationStateDefinition[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const id = typeof (item as any).id === 'string' ? (item as any).id.trim() : '';
    if (!id) {
      return;
    }

    states.push({
      id,
      description: typeof (item as any).description === 'string'
        ? (item as any).description.trim()
        : '',
      instructions: asStringArray((item as any).instructions),
      examples: asStringArray((item as any).examples),
      transitions: normalizeTransitions((item as any).transitions),
      reasoningMode: isReasoningMode((item as any).reasoningMode)
        ? (item as any).reasoningMode
        : 'inherit',
      allowedTools: asStringArray((item as any).allowedTools)
    });
  });

  return states;
};

export const resolveStartStateId = (
  editorSettings: unknown,
  states: ConversationStateDefinition[]
): string | null => {
  if (editorSettings && typeof editorSettings === 'object') {
    const startConnection = typeof (editorSettings as any).startConnection === 'string'
      ? (editorSettings as any).startConnection.trim()
      : '';

    if (states.some((state) => state.id === startConnection)) {
      return startConnection;
    }
  }

  return states[0]?.id || null;
};

export const findStateById = (
  states: ConversationStateDefinition[],
  stateId?: string | null
) => states.find((state) => state.id === stateId) || null;
