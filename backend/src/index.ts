import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения САМЫМ ПЕРВЫМ ДЕЙСТВИЕМ
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Импортируем централизованную конфигурацию
import { NODE_ENV, IS_PRODUCTION, IS_DEVELOPMENT, APP_CONFIG, LOG_CONFIG } from './config/app-config';

console.log(`🚀 Starting application in ${NODE_ENV} mode`);

if (IS_DEVELOPMENT) {
    console.log('⚠️  Development mode: Enhanced logging enabled, CORS is lenient');
}

if (IS_PRODUCTION) {
    console.log('🔒 Production mode: Security features active, logging minimized');
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import prisma from './db/prisma';
import { activeSessions } from './session-store';

// Импортируем наши новые роуты
import sessionRoutes from './api/sessions.routes';
import authRoutes from './api/auth.routes';
import dashboardRoutes from './api/dashboard.routes';
import botConfigRoutes from './api/bot-config.routes';
import aiAssistRoutes from './api/ai-assist.routes';
import tokenRoutes from './api/token.routes'; // Импортируем новый роут
import { productsRoutes } from './api/products.routes';
import { realtimeRequestLogger } from './middleware/realtime-request.middleware';
import { botExecuteRoutes } from './api/bot-execute.routes'; // Новые bot functions

const app = express();
const port = process.env.PORT || 3000;

// --- CORS Configuration ---
// Настройте разрешенные домены в переменной окружения ALLOWED_ORIGINS
// Пример в .env: ALLOWED_ORIGINS="http://localhost:9001,https://yourdomain.com,*.ondigitalocean.app"
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : IS_DEVELOPMENT 
        ? APP_CONFIG.DEV_ALLOWED_ORIGINS // Автоматические localhost origins для development
        : []; // Production требует явного указания доменов

const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // 🔇 Логирование CORS только для не-localhost запросов
        if (origin && !origin.includes('localhost')) {
            console.log(`🌐 CORS check: origin="${origin}", allowed origins:`, allowedOrigins);
        }
        
        // Разрешаем запросы без origin (same-origin requests - когда frontend и backend на одном домене)
        if (!origin) {
            // 🔇 Убрали избыточное логирование same-origin запросов
            return callback(null, true);
        }
        
        // В development режиме автоматически разрешаем localhost origins
        if (IS_DEVELOPMENT && origin && origin.includes('localhost')) {
            console.log(`✅ CORS: Allowing localhost origin in development: ${origin}`);
            return callback(null, true);
        }
        
        // Проверяем точные совпадения и wildcard домены
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed === origin) {
                return true; // Точное совпадение
            }
            
            if (allowed.startsWith('*.')) {
                // Wildcard домены: *.ondigitalocean.app
                const domain = allowed.substring(2); // Убираем "*."
                return origin.endsWith('.' + domain);
            }
            
            return false;
        });
        
        if (isAllowed) {
            console.log(`✅ CORS: Allowing configured origin: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`❌ CORS: Blocked request from unauthorized origin: ${origin}`);
            console.log(`📝 CORS: Add "${origin}" or "*.domain.com" to ALLOWED_ORIGINS environment variable`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Разрешить отправку cookies
    optionsSuccessStatus: 200
};

// --- Middlewares ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(realtimeRequestLogger);

// --- Static Files ---
// Раздаем виджет как статические файлы
app.use('/widget', express.static(path.join(__dirname, '../public/widget')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Раздаем frontend статические файлы (для App Platform)
if (IS_PRODUCTION) {
    console.log('🌐 Setting up frontend static files serving...');
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));
    
    // Обрабатываем SPA routes (всегда отдаем index.html для frontend маршrutов)
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Пропускаем API routes и статические файлы
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/widget/') || 
            req.path.startsWith('/public/') ||
            req.path.includes('.')) {
            return next();
        }
        
        // Для всех остальных routes отдаем index.html
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
    
    console.log(`📁 Frontend static files: ${frontendPath}`);
}

// --- API Routes ---
// Подключаем все роуты
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bot-config', botConfigRoutes);
app.use('/api/ai-assist', aiAssistRoutes);
app.use('/api/token', tokenRoutes); // Регистрируем новый роут
app.use('/api/products', productsRoutes);
app.use('/api/bot-execute', botExecuteRoutes); // Роуты для голосового бота
// Здесь в будущем можно будет добавлять другие роутеры
// app.use('/api/users', userRoutes);


// --- WebSocket Server for Audio Recording ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const recordingsDir = path.resolve(__dirname, '../recordings');
// Убедимся, что папка для записей существует
require('fs').mkdir(recordingsDir, { recursive: true }, (err: any) => {
    if (err) console.error("Failed to create recordings directory:", err);
});

/**
 * Handles a new WebSocket connection for audio recording.
 * @param ws The WebSocket instance.
 * @param req The incoming HTTP request.
 */
const handleWebSocketConnection = async (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', `ws://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');
  const track = url.searchParams.get('track');
  const ext = url.searchParams.get('ext') || 'webm';
  const hostname = url.searchParams.get('hostname');

  // --- Hostname Verification ---
  if (!hostname) {
    if (IS_DEVELOPMENT) console.warn('[WSS] Connection attempt without hostname. Closing.');
    ws.close(1008, 'Hostname is required.');
    return;
  }
  
  try {
    const domain = await prisma.domain.findUnique({ where: { hostname } });
    if (!domain) {
      if (IS_DEVELOPMENT) console.warn(`[WSS] Connection attempt from unauthorized hostname: ${hostname}. Closing.`);
      ws.close(1008, 'Unauthorized hostname.');
      return;
    }
    if (IS_DEVELOPMENT) console.log(`[WSS] Connection from authorized hostname: ${hostname} (User: ${domain.userId})`);
    // Регистрируем сессию
    if(sessionId) {
      activeSessions.set(sessionId, domain.userId);
      if (IS_DEVELOPMENT) console.log(`[WSS] Session ${sessionId} registered for user ${domain.userId}. Total active sessions: ${activeSessions.size}`);
    }
  } catch (error) {
    console.error(`[WSS] Database error during hostname verification:`, IS_PRODUCTION ? 'Connection failed' : error);
    ws.close(1011, 'Server error during authentication.');
    return;
  }
  // --- End Hostname Verification ---

  if (!['webm', 'mp4'].includes(ext)) {
    ws.close(1008, "Invalid file extension");
    return;
  }

  if (!sessionId || !track) {
    ws.close(1008, "SessionID and track are required.");
    return;
  }
  
  if (IS_DEVELOPMENT) console.log(`WebSocket client connected for session ${sessionId}, track ${track}.`);

  const filePath = path.join(recordingsDir, `recording-${sessionId}-${track}.${ext}`);
  const fileStream = require('fs').createWriteStream(filePath, { flags: 'a' });

  fileStream.on('error', (err: any) => {
    console.error(`Error writing to file for session ${sessionId}, track ${track}:`, IS_PRODUCTION ? 'File error' : err);
    ws.close(1011, 'File system error on server.');
  });

  ws.on('message', (message: Buffer) => {
    fileStream.write(message);
  });

  ws.on('close', () => {
    if (IS_DEVELOPMENT) console.log(`WebSocket client disconnected. Finishing recording for session ${sessionId}, track ${track}.`);
    // Удаляем сессию из хранилища
    if(sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      if (IS_DEVELOPMENT) console.log(`[WSS] Session ${sessionId} deregistered. Total active sessions: ${activeSessions.size}`);
    }
    fileStream.end();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', IS_PRODUCTION ? 'Connection error' : error);
    fileStream.end();
    ws.close(1011, 'An unexpected error occurred.');
  });
};

wss.on('connection', handleWebSocketConnection);


server.listen(port, () => {
  console.log(`🌐 Backend server with WebSocket listening on http://localhost:${port}`);
  
  if (IS_DEVELOPMENT) {
    console.log(`📝 Frontend dev server: http://localhost:9001`);
    console.log(`📦 Widget dev server: http://localhost:9000`);
    console.log(`🔧 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  } else {
    console.log(`🔒 Production server ready`);
  }
}); 
