# Implementação da auditoria — 2 de outubro de 2026

Objetivo: corrigir os achados da auditoria autorizada, mantendo a identidade !AI e dados reais.

Arquitetura: preservar React/Vite e APIs atuais; publicar HTML pré-renderizado para as páginas públicas e carregar o questionário sob demanda. Não adicionar ferramentas de rastreamento externas sem necessidade. Conteúdo institucional factual depende de informação fornecida pelo responsável.

- [x] Conteúdo e conversão: hero específico, remoção de cases provisórios, páginas úteis de serviços, CTA com contexto e canal direto.
- [x] Formulário e diagnóstico: e-mail opcional mantendo WhatsApp obrigatório, expectativa de dez perguntas, timeout, erros acessíveis e bloqueio de diagnóstico sem sessão persistida.
- [x] Acessibilidade: pausa do vídeo, respeito a movimento reduzido, fontes legíveis, foco de teclado e estados anunciados.
- [x] Privacidade: página acessível com finalidades e canal; remover afirmações não verificadas sobre armazenamento/terceiros.
- [x] SEO e rotas: HTML público pré-renderizado, canonical/metadados por URL, sitemap, robots e 404 real.
- [x] Performance: WebP responsivo, vídeo sob demanda, lazy loading do questionário e cache para arquivos versionados.
- [x] Validação: compilação, tipos, testes de validação, HTML gerado, navegação/teclado/responsividade no navegador e fluxo de diagnóstico com dados locais de teste.
- [x] Entrega: checklist por achado indicando pendências que exigem dados reais, ambiente de produção ou dados de campo.

Critérios: nenhuma prova social inventada; contato configurado exclusivamente para links de contato; nenhum envio real de mensagens; testes de dados em memória e sem banco de produção; não apresentar métricas de campo sem medição.

Verificação concluída: build completo, typecheck e regressão local passaram; browser confirmou início sem e-mail, salvamento e recarga, foco e menu por teclado. Publicação em produção e dados comerciais reais permanecem pendentes, discriminados no relatório de entrega.

## Atualização de posicionamento comercial

Removidos os planos de CRM e todos os valores públicos da página inicial e das páginas de serviços. A navegação agora leva à consultoria, que explica o diagnóstico da operação, a definição de prioridades e a proposta sob medida. O CRM apresenta recursos e usos, sem pacotes comerciais. Investimentos são apresentados na consultoria.

## Captação sem CRM — 3 de outubro de 2026

Formulário conectado ao Formspree mdekqoqo, com confirmação de recebimento antes de redirecionar para /obrigado, validação, prevenção de envio simultâneo, proteção antispam e recuperação de erro. A rota /digital-check apresenta o briefing simples; o questionário e as APIs anteriores são preservados para evolução futura, mas não fazem parte do fluxo público. Privacidade e CTAs refletem a análise manual. /obrigado não aparece no sitemap e tem noindex.
