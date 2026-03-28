import { Request, Response, Router } from 'express';
import { executeBotFunction, getAllFunctionDefinitions } from '../bot-functions';

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
  response: `Функция ${functionName} не найдена.`
});

const buildServerErrorResponse = () => ({
  success: false,
  error: 'Internal server error',
  response: 'Произошла ошибка при выполнении функции.'
});

router.post('/:functionName', async (req: Request, res: Response) => {
  const { functionName } = req.params;
  const args = req.body;

  console.log(`\n🤖 FUNCTION CALL RECEIVED:`);
  console.log(`📝 Function: ${functionName}`);
  console.log(`🌐 Hostname: ${args.hostname || 'not provided'}`);
  console.log(`📋 Parameters:`, JSON.stringify(args, null, 2));

  try {
    const result = await executeBotFunction(functionName, args);

    console.log(`✅ Function ${functionName} completed successfully`);
    console.log(`📤 Response type: ${result.success ? 'Success' : 'Error'}`);
    console.log(`📄 Response preview: ${result.response?.substring(0, 100)}...`);

    res.json(result);
  } catch (error: any) {
    console.error(`❌ FUNCTION EXECUTION ERROR:`);
    console.error(`📝 Function: ${functionName}`);
    console.error(`💥 Error:`, error.message);

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
    console.error('Error getting function definitions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get function definitions'
    });
  }
});

export { router as botExecuteRoutes };
