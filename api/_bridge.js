import handler from '../dist/server/index.js';
import { nodeToWebRequest, sendWebResponse } from 'vinext/server/prod-server';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Resolve o path + query original da requisição, priorizando:
 * 1. O parâmetro `__route` injetado pelas regras de rewrite do vercel.json
 * 2. O header `x-forwarded-url` fornecido pela Vercel
 * 3. O header `x-matched-path` fornecido pela Vercel
 * 4. A própria `req.url` caso comece com /api/
 */
export function resolveTargetUrl(req) {
  const host = req.headers?.host || 'localhost';
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  const rawUrl = req.url || '/';

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl, `${proto}://${host}`);
  } catch {
    parsedUrl = new URL(rawUrl, 'https://localhost');
  }

  // 1. __route vindo do rewrite do vercel.json
  const routeParam = parsedUrl.searchParams.get('__route');
  if (routeParam) {
    parsedUrl.searchParams.delete('__route');
    const remainingQuery = parsedUrl.searchParams.toString();
    const cleanRoute = routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
    return `${cleanRoute}${remainingQuery ? `?${remainingQuery}` : ''}`;
  }

  // 2. x-forwarded-url da Vercel
  const xForwardedUrl = req.headers?.['x-forwarded-url'];
  if (xForwardedUrl && typeof xForwardedUrl === 'string' && xForwardedUrl.startsWith('/api/')) {
    return xForwardedUrl;
  }

  // 3. x-matched-path da Vercel
  const xMatchedPath = req.headers?.['x-matched-path'];
  if (xMatchedPath && typeof xMatchedPath === 'string' && xMatchedPath.startsWith('/api/')) {
    const query = parsedUrl.search;
    return `${xMatchedPath}${query}`;
  }

  // 4. req.url direta
  if (rawUrl.startsWith('/api/') && !rawUrl.startsWith('/api/_bridge')) {
    return rawUrl;
  }

  return rawUrl;
}

export default async function bridge(req, res) {
  // Suporte a Web Standard Request (Edge / Web Standard runtime)
  if (req instanceof Request) {
    const url = new URL(req.url);
    const routeParam = url.searchParams.get('__route');
    let targetUrlStr = req.url;

    if (routeParam) {
      url.searchParams.delete('__route');
      const cleanRoute = routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
      targetUrlStr = `${url.origin}${cleanRoute}${url.search ? url.search : ''}`;
    }

    const finalUrl = new URL(targetUrlStr);
    console.log('[bridge]', {
      method: req.method,
      pathname: finalUrl.pathname,
    });

    const forwardReq = routeParam ? new Request(finalUrl, req) : req;
    return handler(forwardReq);
  }

  // Suporte a Node.js Serverless Function (IncomingMessage, ServerResponse)
  try {
    const targetUrl = resolveTargetUrl(req);
    const targetPathname = targetUrl.split('?')[0];

    // Logging seguro conforme especificação: apenas method e pathname (sem tokens ou dados sensíveis)
    console.log('[bridge]', {
      method: req.method,
      pathname: targetPathname,
    });

    const webRequest = nodeToWebRequest(req, targetUrl);
    const webResponse = await handler(webRequest);
    await sendWebResponse(webResponse, req, res);
  } catch (err) {
    console.error('[Vercel Bridge Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    }
  }
}
