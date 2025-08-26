import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateStateContent } from '../controllers/ai-assist.controller';

const router = Router();

// POST /api/ai-assist/generate-state
router.post('/generate-state', authMiddleware, generateStateContent);

export default router; 