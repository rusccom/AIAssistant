import { NextFunction, Request, Response } from 'express';
import { logRealtimeInfo } from '../features/realtime/shared/realtime-logging';

const OBSERVED_PREFIXES = ['/api/token', '/api/bot-execute'];

const isObservedPath = (path: string) => {
  return OBSERVED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const getBody = (req: Request) => {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
};

const getToolName = (path: string) => {
  return path.startsWith('/api/bot-execute/')
    ? path.slice('/api/bot-execute/'.length)
    : null;
};

const buildRequestMeta = (req: Request) => {
  const body = getBody(req);

  return {
    traceId: body.traceId || req.get('x-trace-id') || null,
    turnId: body.turnId || null,
    hostname: body.hostname || null,
    toolName: getToolName(req.path),
    bodyKeys: Object.keys(body).slice(0, 10)
  };
};

export const realtimeRequestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isObservedPath(req.path)) {
    next();
    return;
  }

  const startedAt = Date.now();
  const requestMeta = buildRequestMeta(req);

  logRealtimeInfo('http.request_started', {
    ...requestMeta,
    method: req.method,
    path: req.path
  });

  res.on('finish', () => {
    logRealtimeInfo('http.request_finished', {
      ...requestMeta,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
};
