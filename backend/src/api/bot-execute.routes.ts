import { Request, Response, Router } from 'express';
import { executeBotFunction, getAllFunctionDefinitions } from '../bot-functions';
import {
  logRealtimeError,
  logRealtimeInfo,
  sanitizeRealtimeLogValue
} from '../features/realtime/shared/realtime-logging';

const router = Router();

const buildFunctionsResponse = () => {
  const functions = getAllFunctionDefinitions();

  return {
    success: true,
    count: functions.length,
    functions: functions.map((func) => ({
      name: func.function.name,
      description: func.function.description,
      parameters: func.function.parameters
    }))
  };
};

const buildNotFoundResponse = (functionName: string) => ({
  success: false,
  error: `Function ${functionName} not found`,
  response: `Function ${functionName} was not found.`
});

const buildServerErrorResponse = () => ({
  success: false,
  error: 'Internal server error',
  response: 'An error occurred while executing the function.'
});

router.post('/:functionName', async (req: Request, res: Response) => {
  const { functionName } = req.params;
  const args = req.body || {};
  const traceId = args.traceId || null;

  logRealtimeInfo('tool.request_received', {
    traceId,
    turnId: args.turnId || null,
    stateId: args.stateId || null,
    instructionVersion: args.instructionVersion || null,
    functionName,
    hostname: args.hostname || null,
    params: sanitizeRealtimeLogValue(args)
  });

  try {
    const result = await executeBotFunction(functionName, args);

    logRealtimeInfo('tool.request_finished', {
      traceId,
      turnId: args.turnId || null,
      stateId: args.stateId || null,
      functionName,
      success: Boolean(result.success),
      response: sanitizeRealtimeLogValue(result.response)
    });

    res.json(result);
  } catch (error: any) {
    logRealtimeError('tool.request_failed', {
      traceId,
      turnId: args.turnId || null,
      stateId: args.stateId || null,
      functionName,
      hostname: args.hostname || null,
      message: error.message
    });

    if (error.message.includes('not found')) {
      return res.status(404).json(buildNotFoundResponse(functionName));
    }

    res.status(500).json(buildServerErrorResponse());
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(buildFunctionsResponse());
  } catch (error) {
    logRealtimeError('tool.catalog_failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get function definitions'
    });
  }
});

export { router as botExecuteRoutes };
