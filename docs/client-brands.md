# Marcas e conexões

Seção entre Sobre e perguntas frequentes. Duas faixas contínuas em sentidos opostos, logos maiores, fundo carbon do site e cores originais no hover. A lista é dividida automaticamente entre as faixas; cópias decorativas ficam ocultas dos leitores de tela. O movimento pausa ao passar o cursor e pelo controle de pausa. Com movimento reduzido, os logos aparecem em uma grade estática.

Para adicionar uma marca, copie o arquivo oficial para `public/clients/` e acrescente `{name:'Empresa',logo:'/clients/empresa.svg'}` à lista em `app/client-brands.tsx`. A ordem da lista define a ordem da grade. Sem arquivo, aparece o nome. `caption` permite exibir um nome junto a um símbolo, como Twovortex.

Fontes dos arquivos:
- VCompany: https://vcom.com.br/logo.svg (arquivo vetorial oficial, fundo transparente).
- UnB: https://marca.unb.br/marca.php (assinatura básica horizontal).
- Cardiofitness: https://cardiofitness.com.br/wp-content/uploads/2023/08/logo_cardiofitness-extendida.png, vetorizada em curvas SVG (símbolo e letras, sem imagem incorporada). Variante para fundo escuro com nome claro e símbolo no azul original; cinza no repouso e azul no hover, preservando a leitura. A assinatura horizontal ocupa a largura disponível do item.
- Limpax e Seidler: arquivos dos projetos locais.
- Host Only Tecnologia: PNG transparente fornecido por Ítalo; preservados desenho, nome e gradiente azul/ciano original.
- Turma da Ritinha, Instituto Rita Trindade, Rita Trindade, Método Hálito Blindado e Twovortex: imagens fornecidas por Ítalo, com fundo removido pela ferramenta nativa de edição de imagem. Prompt: remover somente fundo e preservar desenho, texto e cores.

Alpha Clinic Vital aparece como nome até a inclusão do arquivo oficial.
