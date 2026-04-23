import { RealtimeLogger } from '../shared/realtime-logger';
import { LocalStateController } from '../shared/state-machine';
import {
  SessionStateDefinition,
  StartRuntimeInput
} from '../shared/realtime-session.types';
import { GeminiResumeTrace } from './gemini-resume-state';

interface GeminiTransitionContext {
  getResumeTrace: () => GeminiResumeTrace;
  getSession: () => any;
  input: StartRuntimeInput;
  isClosed: () => boolean;
  logger: RealtimeLogger;
  nextGeneration: () => number;
  openSession: (state: SessionStateDefinition, generation: number) => Promise<any>;
  setClosed: () => void;
  setSession: (session: any) => void;
  setSessionReady: (ready: boolean) => void;
  stateController: LocalStateController;
}

const getTransitionTrace = (context: GeminiTransitionContext) => {
  return context.stateController.getCurrentStateTrace();
};

const buildReconnectDetails = (
  context: GeminiTransitionContext,
  previousStateId: string,
  nextState: SessionStateDefinition
) => {
  const resumeTrace = context.getResumeTrace();
  return {
    fromStateId: previousStateId,
    hasResumeHandle: Boolean(resumeTrace.handle),
    resumeStrategy: resumeTrace.canResume ? 'session_resume' : 'cold_reconnect',
    resumable: resumeTrace.resumable,
    stateEntryId: getTransitionTrace(context).entryId,
    toStateId: nextState.id,
    transitionId: getTransitionTrace(context).transitionId
  };
};

const logReconnectStart = (
  context: GeminiTransitionContext,
  previousStateId: string,
  nextState: SessionStateDefinition
) => {
  context.logger.info('runtime', 'reconnect_for_state_transition',
    buildReconnectDetails(context, previousStateId, nextState));
};

const logActivationRequested = (context: GeminiTransitionContext) => {
  context.logger.info('state', 'activation_requested', {
    source: 'gemini.transition_reconnect',
    stateEntryId: getTransitionTrace(context).entryId,
    stateId: context.stateController.getCurrentState().id,
    stateTrace: getTransitionTrace(context),
    transitionId: getTransitionTrace(context).transitionId
  });
};

const replaceSession = async (
  context: GeminiTransitionContext,
  nextState: SessionStateDefinition,
  generation: number
) => {
  const previousSession = context.getSession();
  context.setSessionReady(false);
  context.setSession(undefined);
  previousSession?.close();
  context.setSession(await context.openSession(nextState, generation));
};

const handleReconnectError = (
  context: GeminiTransitionContext,
  error: unknown
) => {
  context.logger.error('runtime', 'reconnect_failed', {
    message: error instanceof Error ? error.message : String(error)
  });
  context.setClosed();
  context.input.onDisconnect('Session reconnect failed.');
};

const reconnectForState = async (
  context: GeminiTransitionContext,
  nextState: SessionStateDefinition,
  previousStateId: string
) => {
  const generation = context.nextGeneration();
  try {
    logReconnectStart(context, previousStateId, nextState);
    logActivationRequested(context);
    await replaceSession(context, nextState, generation);
  } catch (error) {
    handleReconnectError(context, error);
  }
};

export const applyPendingGeminiState = async (
  context: GeminiTransitionContext,
  source: string,
  turnId: string | null
) => {
  const previousStateId = context.stateController.getCurrentState().id;
  const nextState = context.stateController.applyPendingState({ source, turnId });
  if (!nextState || context.isClosed()) return false;

  await reconnectForState(context, nextState, previousStateId);
  return true;
};
