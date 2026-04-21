import { Request } from 'express';

const getRequestHost = (req: Request) => {
  const forwardedHost = req.get('x-forwarded-host');
  return (forwardedHost || req.get('host') || '').split(',')[0].trim();
};

const getRequestProtocol = (req: Request) => {
  return req.get('x-forwarded-proto') || req.protocol;
};

const buildRequestOrigin = (req: Request) => {
  return `${getRequestProtocol(req)}://${getRequestHost(req)}`;
};

export const buildWidgetScriptUrl = (
  req: Request,
  hostname: string,
  embedToken: string
) => {
  const url = new URL('/widget/widget.js', buildRequestOrigin(req));
  url.searchParams.set('hostname', hostname);
  url.searchParams.set('embed', embedToken);
  return url.toString();
};
