import { Router, Request, Response } from 'express';
import { executeBotFunction } from '../bot-functions';

const router = Router();

/**
 * Универсальный endpoint для выполнения bot functions
 * POST /api/bot-execute/:functionName
 */
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
        
        return res.json(result);

    } catch (error: any) {
        console.error(`❌ FUNCTION EXECUTION ERROR:`);
        console.error(`📝 Function: ${functionName}`);
        console.error(`💥 Error:`, error.message);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: `Function ${functionName} not found`,
                response: `Функция ${functionName} не найдена.`
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            response: 'Произошла ошибка при выполнении функции.'
        });
    }
});

/**
 * Получить список всех доступных bot functions
 * GET /api/bot-execute
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { getAllFunctionDefinitions } = await import('../bot-functions');
        const functions = getAllFunctionDefinitions();
        
        res.json({
            success: true,
            count: functions.length,
            functions: functions.map(func => ({
                name: func.function.name,
                description: func.function.description,
                parameters: func.function.parameters
            }))
        });
    } catch (error) {
        console.error('Error getting function definitions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get function definitions'
        });
    }
});

export { router as botExecuteRoutes }; 