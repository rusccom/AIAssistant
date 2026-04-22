interface SessionResumptionUpdateLike {
  lastConsumedClientMessageIndex?: string;
  newHandle?: string;
  resumable?: boolean;
}

export interface GeminiResumeTrace {
  canResume: boolean;
  handle: string | null;
  lastConsumedClientMessageIndex: string | null;
  resumable: boolean;
}

interface GeminiResumeState {
  handle: string | null;
  lastConsumedClientMessageIndex: string | null;
  resumable: boolean;
}

const createResumeTrace = (
  state: GeminiResumeState
): GeminiResumeTrace => ({
  canResume: Boolean(state.resumable && state.handle),
  handle: state.handle,
  lastConsumedClientMessageIndex: state.lastConsumedClientMessageIndex,
  resumable: state.resumable
});

const applyResumableFlag = (
  state: GeminiResumeState,
  update: SessionResumptionUpdateLike
) => {
  if (typeof update.resumable !== 'boolean') {
    return;
  }

  state.resumable = update.resumable;
  if (!state.resumable) {
    state.handle = null;
  }
};

const applyResumeHandle = (
  state: GeminiResumeState,
  update: SessionResumptionUpdateLike
) => {
  if (typeof update.newHandle !== 'string') {
    return;
  }

  state.handle = update.newHandle || null;
};

const applyConsumedMessageIndex = (
  state: GeminiResumeState,
  update: SessionResumptionUpdateLike
) => {
  if (typeof update.lastConsumedClientMessageIndex !== 'string') {
    return;
  }

  state.lastConsumedClientMessageIndex = update.lastConsumedClientMessageIndex;
};

export const createGeminiResumeState = () => {
  const state: GeminiResumeState = {
    handle: null,
    lastConsumedClientMessageIndex: null,
    resumable: false
  };

  return {
    getResumeHandle: () => (state.resumable ? state.handle : null),
    getTrace: () => createResumeTrace(state),
    update: (update?: SessionResumptionUpdateLike) => {
      if (!update) {
        return createResumeTrace(state);
      }

      applyResumableFlag(state, update);
      applyResumeHandle(state, update);
      applyConsumedMessageIndex(state, update);
      return createResumeTrace(state);
    }
  };
};
