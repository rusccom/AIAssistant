import { getAllFunctionDefinitions } from '../../../bot-functions';
import { generateAgentInstructions } from '../../../services/instructions.service';
import {
  getRealtimeProviderCatalog,
  resolveRealtimeModel,
  resolveRealtimeVoice
} from './realtime.catalog';
import { PreparedRealtimeConfig } from './realtime.types';

export const buildRealtimeConfig = (botConfig: any): PreparedRealtimeConfig => {
  const catalog = getRealtimeProviderCatalog(botConfig.provider);

  return {
    provider: catalog.id,
    model: resolveRealtimeModel(catalog.id, botConfig.model),
    voice: resolveRealtimeVoice(catalog.id, botConfig.voice),
    instructions: generateAgentInstructions(botConfig),
    tools: getAllFunctionDefinitions()
  };
};
