import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения САМЫМ ПЕРВЫМ ДЕЙСТВИЕМ
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Определяем режим работы приложения
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

console.log(`🚀 Starting application in ${NODE_ENV} mode`);

if (isDevelopment) {
    console.log('⚠️  Development mode: Enhanced logging enabled, CORS is lenient');
}

if (isProduction) {
    console.log('🔒 Production mode: Security features active, logging minimized');
}

import express from 'express';
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
import { botExecuteRoutes } from './api/bot-execute.routes'; // Новые bot functions

const app = express();
const port = process.env.PORT || 3000;

// --- CORS Configuration ---
// Настройте разрешенные домены в переменной окружения ALLOWED_ORIGINS
// Пример в .env: ALLOWED_ORIGINS="http://localhost:9001,https://yourdomain.com"
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : isDevelopment 
        ? ['http://localhost:9001', 'http://localhost:9000'] // Development defaults
        : []; // Production требует явного указания доменов

const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // В development режиме разрешаем запросы без origin (Postman, тесты)
        if (!origin && isDevelopment) return callback(null, true);
        
        if (origin && allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            if (isDevelopment) {
                console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
            }
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Разрешить отправку cookies
    optionsSuccessStatus: 200
};

// --- Middlewares ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Static Files ---
// Раздаем виджет как статические файлы
app.use('/widget', express.static(path.join(__dirname, '../public/widget')));
app.use('/public', express.static(path.join(__dirname, '../public')));

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
    if (isDevelopment) console.warn('[WSS] Connection attempt without hostname. Closing.');
    ws.close(1008, 'Hostname is required.');
    return;
  }
  
  try {
    const domain = await prisma.domain.findUnique({ where: { hostname } });
    if (!domain) {
      if (isDevelopment) console.warn(`[WSS] Connection attempt from unauthorized hostname: ${hostname}. Closing.`);
      ws.close(1008, 'Unauthorized hostname.');
      return;
    }
    if (isDevelopment) console.log(`[WSS] Connection from authorized hostname: ${hostname} (User: ${domain.userId})`);
    // Регистрируем сессию
    if(sessionId) {
      activeSessions.set(sessionId, domain.userId);
      if (isDevelopment) console.log(`[WSS] Session ${sessionId} registered for user ${domain.userId}. Total active sessions: ${activeSessions.size}`);
    }
  } catch (error) {
    console.error(`[WSS] Database error during hostname verification:`, isProduction ? 'Connection failed' : error);
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
  
  if (isDevelopment) console.log(`WebSocket client connected for session ${sessionId}, track ${track}.`);

  const filePath = path.join(recordingsDir, `recording-${sessionId}-${track}.${ext}`);
  const fileStream = require('fs').createWriteStream(filePath, { flags: 'a' });

  fileStream.on('error', (err: any) => {
    console.error(`Error writing to file for session ${sessionId}, track ${track}:`, isProduction ? 'File error' : err);
    ws.close(1011, 'File system error on server.');
  });

  ws.on('message', (message: Buffer) => {
    fileStream.write(message);
  });

  ws.on('close', () => {
    if (isDevelopment) console.log(`WebSocket client disconnected. Finishing recording for session ${sessionId}, track ${track}.`);
    // Удаляем сессию из хранилища
    if(sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      if (isDevelopment) console.log(`[WSS] Session ${sessionId} deregistered. Total active sessions: ${activeSessions.size}`);
    }
    fileStream.end();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', isProduction ? 'Connection error' : error);
    fileStream.end();
    ws.close(1011, 'An unexpected error occurred.');
  });
};

wss.on('connection', handleWebSocketConnection);


server.listen(port, () => {
  console.log(`🌐 Backend server with WebSocket listening on http://localhost:${port}`);
  
  if (isDevelopment) {
    console.log(`📝 Frontend dev server: http://localhost:9001`);
    console.log(`📦 Widget dev server: http://localhost:9000`);
    console.log(`🔧 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  } else {
    console.log(`🔒 Production server ready`);
  }
}); 