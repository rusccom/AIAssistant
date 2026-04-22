import { ConversationStateDefinition } from './state-machine.types';

const USER_BASE_FIELDS = [
  'identity',
  'task',
  'demeanor',
  'tone',
  'levelOfEnthusiasm',
  'formality',
  'levelOfEmotion',
  'fillerWords',
  'pacing',
  'otherDetails',
  'instructions'
] as const;

const normalizeText = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const collectBaseInstructions = (config: any) => {
  return USER_BASE_FIELDS
    .map((field) => normalizeText(config?.[field]))
    .filter(Boolean);
};

const collectStateInstructions = (state: ConversationStateDefinition | null) => {
  if (!state) {
    return [];
  }

  return [
    normalizeText(state.description),
    ...state.instructions.map(normalizeText),
    ...state.examples.map(normalizeText)
  ].filter(Boolean);
};

export const buildStateScopedInstructions = (
  config: any,
  state: ConversationStateDefinition | null
) => {
  return [
    ...collectBaseInstructions(config),
    ...collectStateInstructions(state)
  ].join('\n\n').trim();
};
