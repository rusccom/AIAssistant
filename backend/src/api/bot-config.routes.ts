import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getBotConfig, updateBotConfig, getDomains } from '../controllers/bot-config.controller';

const router = Router();

// Protected endpoints for the dashboard
router.get('/', authMiddleware, getBotConfig);
router.put('/', authMiddleware, updateBotConfig);
router.get('/domains', authMiddleware, getDomains);

export default router; 