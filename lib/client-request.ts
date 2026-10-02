/** Bounded request time keeps forms recoverable when the server is unavailable. */
export async function requestWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, {...init,signal:controller.signal}); }
  catch (error) { if(controller.signal.aborted) throw new Error('A conexão demorou para responder. Tente novamente ou use um canal de contato direto.'); throw error; }
  finally { clearTimeout(timer); }
}
