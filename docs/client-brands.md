# Marcas e conexões

Seção entre Sobre e perguntas frequentes. Duas faixas contínuas em sentidos opostos, logos maiores, fundo carbon do site e cores originais no hover. A lista é dividida automaticamente entre as faixas; cópias decorativas ficam ocultas dos leitores de tela. O movimento pausa ao passar o cursor e pelo controle de pausa. Com movimento reduzido, os logos aparecem em uma grade estática.

Para adicionar uma marca, copie o arquivo oficial para `public/clients/` e acrescente `{name:'Empresa',logo:'/clients/empresa.svg'}` à lista em `app/client-brands.tsx`. A ordem da lista define a ordem da grade. Sem arquivo, aparece o nome. `caption` permite exibir um nome junto a um símbolo, como Twovortex.

Fontes dos arquivos:
- VCompany: https://vcom.com.br/logo.svg (arquivo vetorial oficial, fundo transparente).
- UnB: https://marca.unb.br/marca.php (assinatura básica horizontal).
- Cardiofitness, Limpax e Seidler: arquivos dos projetos locais.
- Turma da Ritinha, Instituto Rita Trindade, Rita Trindade, Método Hálito Blindado e Twovortex: imagens fornecidas por Ítalo, com fundo removido pela ferramenta nativa de edição de imagem. Prompt: remover somente fundo e preservar desenho, texto e cores.

Alpha Clinic Vital aparece como nome até a inclusão do arquivo oficial.
