import { Request, Response, Router } from 'express';
import * as botConfigService from '../services/bot-config.service';
import {
  buildRealtimeConfigFromState,
  buildStateMachineBootstrap,
  resolveBootstrapState
} from '../features/conversation-state/state-machine.bootstrap';
import { createRealtimeSession } from '../features/realtime/shared/realtime-provider.registry';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { hostname } = req.body;
  if (!hostname) {
    return res.status(400).json({ error: 'Hostname is required' });
  }

  try {
    const botConfig = await botConfigService.getPublicBotConfigByHostname(hostname);
    const stateMachine = buildStateMachineBootstrap(botConfig);
    const initialState = resolveBootstrapState(stateMachine, stateMachine.initialStateId);
    const realtimeConfig = buildRealtimeConfigFromState(botConfig, initialState);
    const session = await createRealtimeSession(realtimeConfig);

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
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
