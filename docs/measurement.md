# Medição do funil

O evento local `icbai:metric` expõe somente nome do evento, canal ou número da etapa. Não inclui nome, e-mail, telefone, mensagem, empresa, respostas ou chave de sessão. Não grava cookies e não envia dados a serviços externos.

Eventos: `cta_click`, `form_start`, `lead_saved`, `diagnostic_started`, `diagnostic_step_saved`, `diagnostic_completed`, `form_error`.

Um provedor de analytics autorizado pode ouvir `window.addEventListener('icbai:metric', ...)`. A integração real, propriedade do Search Console, avaliação de leads e CWV de campo precisam de acesso à conta e baseline. Não há aumento de conversão nem pontuação de campo alegados nesta entrega.

Após publicar: confirmar URLs/canonical/sitemap em Search Console; comparar início e conclusão do diagnóstico por dispositivo; medir LCP/INP/CLS no percentil 75 com amostra suficiente; revisar abandono e erros antes de experimentos.
