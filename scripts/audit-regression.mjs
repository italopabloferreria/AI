import assert from 'node:assert/strict';
import http from 'node:http';
import { requestWithTimeout } from '../lib/client-request.ts';
const base='http://127.0.0.1:4174';
const post=(p,data,token)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-resume-token':token}:{})},body:JSON.stringify(data)});
for(const route of ['/','/crm','/clinicas','/servicos/sites','/servicos/automacoes','/privacidade','/digital-check']) {
  const response=await fetch(base+route); assert.equal(response.status,200,route);
  const html=await response.text(); assert.match(html,/<h1/); assert.match(html,/<link rel="canonical"/); assert.match(html,/og:image/); assert.doesNotMatch(html,/Projeto em preparação|Espaço reservado/);
}
assert.equal((await fetch(base+'/inexistente')).status,404);
assert.match(await (await fetch(base+'/inexistente')).text(),/Este caminho não existe/);
assert.equal((await fetch(base+'/robots.txt')).status,200);
assert.match(await (await fetch(base+'/sitemap.xml')).text(),/\/servicos\/sites/);
const valid={name:'Teste Local',company:'Empresa de Teste',whatsapp:'11999999999',message:'Organizar o acompanhamento dos contatos.',consent:true};
assert.equal((await post('/api/leads',{...valid,consent:false})).status,400);
assert.equal((await post('/api/leads',{...valid,email:'invalido'})).status,400);
const leadResponse=await post('/api/leads',valid); assert.equal(leadResponse.status,201,'e-mail opcional');
const {leadId}=await leadResponse.json();
const sessionResponse=await post('/api/digital-check',{leadId}); assert.equal(sessionResponse.status,201);
const {digitalCheckId:id,resumeToken:token}=await sessionResponse.json();
assert.equal((await fetch(base+`/api/digital-check/${id}`)).status,401);
assert.equal((await fetch(base+`/api/digital-check/${id}`,{headers:{'x-resume-token':token}})).status,200);
const answers={lead_sources:['whatsapp'],lead_handling:['manual_reply'],lead_organization:'spreadsheet',follow_up:'sometimes',manual_tasks:['copy_paste'],system_integration:'mostly_manual',website_function:['presentation_only'],ai_opportunity:['support'],main_bottleneck:'Perdemos tempo organizando contatos em planilhas.',urgency:'3'};
let step=1;for(const [questionKey,answerJson] of Object.entries(answers)){const response=await post(`/api/digital-check/${id}/answers`,{questionKey,answerJson,nextStep:Math.min(10,++step)},token);assert.equal(response.status,200,questionKey);}
const result=await post(`/api/digital-check/${id}/complete`,{},token);assert.equal(result.status,200);assert.ok((await result.json()).recommendations.length>0);
assert.equal((await post(`/api/digital-check/${id}/complete`,{},token)).status,200,'conclusão repetida');
const restored=await(await fetch(base+`/api/digital-check/${id}`,{headers:{'x-resume-token':token}})).json();assert.equal(restored.digitalCheck.status,'completed');
console.log('Regressão passou: páginas, SEO, 404, consentimento, e-mail opcional, sessão protegida, dez respostas, resultado e retomada.');
const slowServer=http.createServer((_request,response)=>setTimeout(()=>response.end('ok'),150));
await new Promise(resolve=>slowServer.listen(0,'127.0.0.1',resolve));
try { await assert.rejects(requestWithTimeout(`http://127.0.0.1:${slowServer.address().port}`,{},20),/demorou para responder/); console.log('Timeout recuperável também verificado.'); }
finally { slowServer.closeAllConnections(); await new Promise(resolve=>slowServer.close(resolve)); }
