import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export interface AuthRequest extends Request {
    user?: { id: number };
    body: Request['body'];
    query: Request['query'];
    params: Request['params'];
    headers: Request['headers'];
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        // Проверяем, существует ли такой пользователь в базе данных
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        
        // Прикрепляем информацию о пользователе к запросу
        req.user = { id: user.id };
        
        // Передаем управление следующему обработчику
        next();

    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}; 