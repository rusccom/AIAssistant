import { verifyWidgetEmbedToken } from './embed-token';

export const isTrustedWidgetRequest = (
  hostname: string,
  embedToken: string | null
) => {
  return verifyWidgetEmbedToken(embedToken, hostname);
};
