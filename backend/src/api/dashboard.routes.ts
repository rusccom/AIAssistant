import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getSessions, getDomains, addDomain, getDashboardFullData } from '../controllers/dashboard.controller';

const router = Router();

// Этот роут теперь защищен: сначала сработает authMiddleware, и только потом getSessions.
router.get('/sessions', authMiddleware, getSessions);
router.get('/domains', authMiddleware, getDomains);
router.get('/data', authMiddleware, getDashboardFullData); // Новый роут для всех данных
router.post('/domains', authMiddleware, addDomain);

export default router; 