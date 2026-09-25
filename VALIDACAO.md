# Validação da entrega

## Versão 2.0: redesign, rodízio corrigido e reorganização

- **Regra de rodízio corrigida:** quem atende no último sábado do mês descansa só no primeiro sábado do mês seguinte e volta ao sorteio a partir do segundo sábado. Há testes para geração, validação e edição manual.
- **Sorteio aleatório:** as duplas são embaralhadas e desempatadas pela quantidade de participações. Testes com várias sementes confirmam escalas diferentes que sempre respeitam as regras.
- **Férias e atestado:** testes confirmam que atendentes ausentes na data nunca são escalados.
- **Importação:** cadastra novos atendentes e, para os existentes, atualiza apenas status e ausências (teste dedicado).
- **Migração:** os dados salvos na versão 1 (`sempre-cs-v1`) são convertidos para o novo formato em português sem apagar o original (teste dedicado).
- `pnpm run verificar`: ESLint sem problemas, Prettier sem diferenças, 24 testes aprovados e build de produção concluído.
- Verificação visual com o Chrome em modo headless, usando dados de exemplo: escala mensal, tabela de atendentes com etiquetas e tooltips de status e experiência, importação e layout móvel a 390px sem rolagem horizontal.
- A importação de arquivos reais e o download do Excel não foram exercitados no navegador. O parser é coberto por testes.
