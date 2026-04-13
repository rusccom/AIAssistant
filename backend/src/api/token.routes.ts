import { Request, Response, Router } from 'express';
import * as botConfigService from '../services/bot-config.service';
import {
  buildRealtimeConfigFromState,
  buildStateMachineBootstrap,
  resolveBootstrapState
} from '../features/conversation-state/state-machine.bootstrap';
import {
  logRealtimeError,
  logRealtimeInfo,
  summarizeRealtimeStateMachine,
  summarizeRealtimeTools
} from '../features/realtime/shared/realtime-logging';
import { createRealtimeSession } from '../features/realtime/shared/realtime-provider.registry';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { hostname, traceId } = req.body || {};
  if (!hostname) {
    return res.status(400).json({ error: 'Hostname is required' });
  }

  try {
    const botConfig = await botConfigService.getPublicBotConfigByHostname(hostname);
    const stateMachine = buildStateMachineBootstrap(botConfig);
    const initialState = resolveBootstrapState(stateMachine, stateMachine.initialStateId);
    const realtimeConfig = buildRealtimeConfigFromState(botConfig, initialState);
    const session = await createRealtimeSession(realtimeConfig);

    logRealtimeInfo('session.token_issued', {
      traceId: traceId || null,
      hostname,
      provider: session.provider,
      transport: session.transport,
      model: session.model,
      voice: session.voice,
      currentStateId: initialState.id,
      instructionVersion: initialState.instructionVersion,
      tools: summarizeRealtimeTools(session.tools),
      stateMachine: summarizeRealtimeStateMachine(stateMachine)
    });

    res.json({
      provider: session.provider,
      transport: session.transport,
      token: session.token,
      expiresAt: session.expiresAt,
      expires_at: session.expiresAt,
      instructions: session.instructions,
      tools: session.tools,
      voice: session.voice,
      model: session.model,
      currentStateId: initialState.id,
      stateMachine
    });
  } catch (error) {
    logRealtimeError('session.token_failed', {
      traceId: traceId || null,
      hostname,
      message: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
