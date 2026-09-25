# Sempre — Escala de Sábados

Aplicação React + Vite, sem backend, para organizar a escala de sábados do time de Sucesso do Cliente. Os dados ficam no `localStorage` do navegador (chave `sempre-escala-v2`). Dados da versão anterior (`sempre-cs-v1`) são migrados automaticamente na primeira abertura, e o original é preservado.

## Executar

Requisitos: Node.js 22.12+ e pnpm 11.

```sh
pnpm install
pnpm dev          # servidor local
pnpm test         # testes de regra e importação
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm build        # gera a pasta dist
pnpm verificar    # lint + formatação + testes + build
```

## Publicar na Vercel

O projeto já contém `vercel.json` (framework Vite, saída `dist`, cache longo para `/assets` e cabeçalhos de segurança).

1. Envie o repositório para o GitHub/GitLab e importe-o em **vercel.com/new**, ou rode `vercel` na pasta do projeto.
2. Em **Settings → Environment Variables**, adicione `ENABLE_EXPERIMENTAL_COREPACK=1` para a Vercel usar o pnpm 11 declarado em `packageManager`.
3. Não há variáveis de ambiente da aplicação.

Os dados continuam salvos no navegador de quem usa: cada navegador tem a sua base, sem sincronização entre usuários.

## Regras da escala

- Dois atendentes por sábado, sorteados aleatoriamente, dando prioridade a quem trabalhou menos no mês e nos dois meses anteriores.
- **Rodízio entre meses:** quem atendeu no último sábado de um mês não trabalha no **primeiro sábado** do mês seguinte. A partir do segundo sábado, volta a participar do sorteio normalmente. Exemplo: quem atendeu em 26/09/2026 fica fora de 03/10/2026 e pode ser escalado de 10/10 em diante.
- **Quem está hoje** de férias, atestado, ausente, afastado ou desligado fica fora de toda escala gerada agora, mesmo que volte no meio do mês. Só entra na geração depois do retorno. A tela de escala mostra quem está fora e o motivo.
- Além disso, cada sábado confere a disponibilidade naquela data: uma ausência futura já cadastrada também impede a escala nos dias dela. Os períodos incluem o primeiro e o último dia.
- Na edição manual não é possível incluir quem não está ativo hoje. Sábados que já passaram são tratados como histórico e não são revalidados.
- **Exclusão:** atendentes que já foram escalados só podem ser excluídos depois de terem o status alterado para Desligado. O botão **Excluir todos** apaga de uma vez todos os que podem ser excluídos e informa quem foi mantido. As escalas passadas continuam salvas.
- O atendente pode ser escalado a partir do mês seguinte à admissão. Até completar 3 meses de casa, é novato e sempre trabalha com alguém experiente.
- Quando o mês seguinte já tem escala, o último sábado do mês gerado não usa quem abre o mês seguinte.
- Trocas manuais passam pelas mesmas validações (do mês e do mês seguinte). A geração é atômica: se não houver dupla válida, a escala salva não é alterada.

## Importação

O supervisor envia a planilha `.xlsx`. Atendentes que ainda não existem são cadastrados; os que já existem têm apenas o status e as ausências atualizados. Detalhes em [IMPORTACAO.md](IMPORTACAO.md).

## Arquitetura (feature by layer)

```
src/
  app/                    composição da aplicação
    App.jsx               layout, navegação entre abas e confirmações
    hooks/                estado persistido, avisos, ferramenta WebMCP
    layout/               barra lateral
  features/
    escala/
      domain/             regras puras: rodízio, elegibilidade, validação, sorteio
      components/         página, cartão do sábado, edição de dupla, painel lateral
    atendentes/
      domain/             status na data, experiência, descrições para tooltips
      components/         página/tabela, formulário, histórico
    importacao/
      services/           leitura e exportação de planilhas (SheetJS)
      components/         página de envio e conferência
  shared/
    components/           Modal, Etiqueta, Dica (tooltip), Avatar, Aviso…
    services/             armazenamento no navegador e migração
    utils/                datas e texto
    styles/global.css     tokens de design e estilos
tests/                    testes com node:test
```

Convenções: nomes em português e camelCase para funções, variáveis e arquivos JS; PascalCase para componentes React; props de evento com prefixo `ao` (`aoSalvar`, `aoFechar`). As camadas `domain` não dependem de React e são testadas diretamente.

## Design

A tipografia usa **Geist** (servida pelo próprio build, via `@fontsource-variable/geist`), com paleta zinc, cantos de 1rem nos cartões, botões em formato pílula e o vermelho da Sempre (`#d5161e`) como cor de destaque. Os tokens ficam no início de `src/shared/styles/global.css`.

Não há autenticação, notificações ou sincronização entre usuários. Limpar os dados do navegador remove o cadastro e o histórico local. O Excel exportado serve para compartilhar a escala, não como backup completo.
