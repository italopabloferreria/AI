# I Can’t Believe It’s AI — beta

Site institucional em português, React 19 + TypeScript, com Vinext (API de rotas do Next.js) para Sites/Cloudflare. Inclui uma opção estática com Vite para Vercel e Netlify, sem backend.

## Rodar

Use Node.js 22.13 ou superior e npm.

```sh
npm ci
npm run dev
```

Abra o endereço informado no terminal. Para validar: `npm run typecheck` e `npm run build`. O build principal gera um Worker em `dist/server` e assets em `dist/client`. `npm run start` executa o Worker localmente.

## Conteúdo, preços e contatos

Edite `app/site.config.ts`: navegação, pilares, lista de preços, planos, cases, etapas e FAQ. Os textos editoriais estão organizados em `app/page.tsx` e `app/sections.tsx`. Tokens, responsividade e movimento: `app/globals.css`. Metadados SSR: `app/layout.tsx`. Mascote: `public/nex.png`; favicon: `public/icon.svg`.

Preencha `contact.email` com o e-mail real ou `contact.whatsapp` com país + DDD + número, somente dígitos. WhatsApp tem preferência quando ambos estão preenchidos. Nenhum contato foi inventado. Enquanto vazios, o formulário valida e permite copiar/baixar o briefing; ele informa que nada foi enviado. Com canal configurado, o visitante precisa confirmar o envio no aplicativo correspondente. Não há banco de dados, coleta oculta, envio automático ou medição de conversões nesta beta.

O consentimento se refere ao diagnóstico; não inscreve em marketing. Revise a informação de privacidade conforme a operação real antes de captar leads. Não solicite dados de pacientes.

## Cases

Os dois registros são espaços editoriais pendentes, não provas de resultado. Substitua os campos em `cases` após autorização das clínicas. Para adicionar imagens, inclua um campo no registro e renderize uma imagem com texto alternativo em `app/sections.tsx`. Não publique nomes, imagens ou métricas sem verificação e autorização. Revise também os benefícios comerciais dos planos antes da abertura pública.

## Vercel / Netlify

```sh
npm run build:static
npm run preview:static
```

O resultado portátil fica em `build/`. Essa opção é uma aplicação estática renderizada no navegador; a versão principal de Sites usa renderização no servidor. Os metadados básicos da opção estática estão em `index.html` e devem acompanhar mudanças em `app/layout.tsx`.

Importe o repositório na Vercel (preset Other) ou Netlify. Os arquivos `vercel.json` e `netlify.toml` definem comando e pasta. Não publique a pasta de código como pasta estática. Não é necessário backend, variável secreta ou chave de IA para esta beta.

## Domínio e SEO

Adicione seu domínio no painel da hospedagem e aplique os registros DNS indicados por ela. Depois, altere `siteUrl` em `app/site.config.ts`. No modo estático, inclua canonical e `og:url` com o domínio final em `index.html`. Um cartão social pode ser adicionado a `public/` e referenciado em `openGraph.images` e `og:image`. Não há imagem social inventada. Mantenha HTTPS e confira o redirecionamento entre www e domínio raiz.

## Validação e limites

Inclui labels, foco visível, navegação por âncoras, menu móvel, FAQ nativo, validação de e-mail e campos, consentimento, redução de movimento e layout responsivo. Build e TypeScript devem passar antes de cada publicação. Valide manualmente o envio com seus contatos reais, teclado e telas móveis antes de campanhas. O diagnóstico gratuito é uma solicitação de análise humana, não uma avaliação automática feita por IA.

A stack principal Vinext ainda está em beta. O arquivo de lock preserva as versões instaladas. Revise atualizações de dependências antes da abertura pública; não execute correções que alterem versões principais sem validar. A versão portátil evita dependência do runtime de Sites na hospedagem final.
