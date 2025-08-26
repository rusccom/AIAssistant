import { Router } from 'express';
import { startSessionHandler, endSessionHandler } from '../controllers/session.controller';

const router = Router();

// Новые маршруты для управления жизненным циклом сессии звонка
router.post('/session/start', startSessionHandler);
router.post('/session/end', endSessionHandler);

export default router; 