import { PrismaClient } from '@prisma/client';

// Инициализируем клиент Prisma.
const prisma = new PrismaClient();
 
// Экспортируем его для использования в других частях приложения.
export default prisma; 