import { Router } from 'express';
import { login, register, logout, getCurrentUser, changePassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/change-password', authMiddleware, changePassword);

export default router; 