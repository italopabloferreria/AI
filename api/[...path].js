import handler from '../dist/server/index.js';
import { nodeToWebRequest, sendWebResponse } from 'vinext/server/prod-server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function (req, res) {
  // Web Standard Request support
  if (req instanceof Request) {
    return handler(req);
  }

  // Node.js IncomingMessage / ServerResponse support
  try {
    const webRequest = nodeToWebRequest(req);
    const webResponse = await handler(webRequest);
    await sendWebResponse(webResponse, req, res);
  } catch (err) {
    console.error('[Vercel API Gateway Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    }
  }
}
