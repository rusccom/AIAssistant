import { Request } from 'express';

const getRequestHost = (req: Request) => {
  const forwardedHost = req.get('x-forwarded-host');
  const requestHost = forwardedHost || req.get('host') || req.hostname || '';
  return requestHost.split(',')[0].trim().toLowerCase();
};

const getOriginUrl = (req: Request) => {
  const origin = req.get('origin');
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin);
  } catch {
    return null;
  }
};

export const buildRealtimeOriginMeta = (req: Request) => {
  const originUrl = getOriginUrl(req);

  return {
    origin: req.get('origin') || null,
    originHostname: originUrl?.hostname?.toLowerCase() || null,
    requestHost: getRequestHost(req)
  };
};
