import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { POST as lead } from '../app/api/leads/route';
import { POST as check } from '../app/api/digital-check/route';
import { GET as restore } from '../app/api/digital-check/[id]/route';
import { POST as answer } from '../app/api/digital-check/[id]/answers/route';
import { POST as complete } from '../app/api/digital-check/[id]/complete/route';
if(process.env.DATABASE_URL || process.env.NODE_ENV!=='test') throw new Error('Local preview requires isolated in-memory test mode.');
const base=path.resolve('build');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpeg':'image/jpeg','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url||'/','http://127.0.0.1:4174');
    if(url.pathname.startsWith('/api/')) {
      const chunks=[]; for await(const chunk of req) chunks.push(chunk);
      const body=Buffer.concat(chunks).toString();
      const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body?{body}: {})});
      const match=url.pathname.match(/^\/api\/digital-check\/([^/]+)(?:\/(answers|complete))?$/);
      let response:Response;
      if(url.pathname==='/api/leads'&&req.method==='POST') response=await lead(request);
      else if(url.pathname==='/api/digital-check'&&req.method==='POST') response=await check(request);
      else if(match) { const context={params:Promise.resolve({id:match[1]})}; response=match[2]==='answers'&&req.method==='POST'?await answer(request,context):match[2]==='complete'&&req.method==='POST'?await complete(request,context):!match[2]&&req.method==='GET'?await restore(request,context):new Response('',{status:405}); }
      else response=new Response('',{status:404});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const pathname=decodeURIComponent(url.pathname);
    let file=path.resolve(base,'.'+pathname);
    if(!file.startsWith(base+path.sep)&&file!==base){res.writeHead(400);res.end();return;}
    if(file===base||pathname==='/') file=path.join(base,'index.html');
    else if(!path.extname(file)) file+='.html';
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){file=path.join(base,'404.html');res.statusCode=404;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Falha no ambiente local de teste.'}));}
}).listen(4174,'127.0.0.1',()=>console.log('Prévia local isolada: http://127.0.0.1:4174 (dados apenas em memória).'));
