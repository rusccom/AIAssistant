import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/app-config';
import { WidgetEmbedClaims } from './embed-token.types';

const EMBED_TOKEN_ALGORITHM = 'HS256';
const EMBED_TOKEN_TYPE = 'widget-embed';

const normalizeHostname = (hostname: string) => hostname.trim().toLowerCase();

const isWidgetEmbedClaims = (value: unknown): value is WidgetEmbedClaims => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const claims = value as Record<string, unknown>;
  return typeof claims.hostname === 'string' && claims.type === EMBED_TOKEN_TYPE;
};

export const readWidgetEmbedToken = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const token = value.trim();
  return token || null;
};

export const createWidgetEmbedToken = (hostname: string) => {
  return jwt.sign(
    { hostname: normalizeHostname(hostname), type: EMBED_TOKEN_TYPE },
    JWT_CONFIG.SECRET,
    { algorithm: EMBED_TOKEN_ALGORITHM, noTimestamp: true }
  );
};

export const verifyWidgetEmbedToken = (
  token: string | null,
  hostname: string
) => {
  if (!token) {
    return false;
  }

  try {
    const payload = jwt.verify(token, JWT_CONFIG.SECRET, {
      algorithms: [EMBED_TOKEN_ALGORITHM]
    });

    return isWidgetEmbedClaims(payload)
      && payload.hostname === normalizeHostname(hostname);
  } catch {
    return false;
  }
};
