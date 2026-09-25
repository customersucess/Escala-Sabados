# Importação de funcionários

Na aba **Importar funcionários**, selecione a planilha `.xlsx`, confira os novos cadastros, as atualizações e os avisos e clique em **Importar funcionários** na prévia. Não é necessário cadastrar pessoas antes.

## Formatos aceitos

1. **Lista de funcionários:** cabeçalhos Nome, Admissão, Status, Inicio e Fim. Também aceita Funcionário/Colaborador, Dt. de Admissão/Data de Admissão e Situação. A linha de cabeçalho pode estar abaixo de um título.
2. **Controle anual de férias:** Nome, Dt. de Admissão e colunas mensais com datas Excel como cabeçalho. Células como `06/04 à 20/04`, `30/09 a 09/10` e `13/10 a 1/11` viram ausências. O ano vem do cabeçalho; dezembro a janeiro avança o ano. A anotação `V=5` é preservada como nota, sem alterar as datas informadas.

É lida a primeira aba, com limite de 5 MB e 10.000 linhas de funcionários. Linhas vazias são ignoradas.

## Cadastros e status

- Novos nomes criam funcionários. Para nomes que já existem, o sistema não duplica o cadastro: atualiza no mesmo ID apenas o status, as ausências e a admissão (quando informada), preservando o histórico de escalas. A comparação ignora acentos, maiúsculas e espaços repetidos; nomes apenas parecidos continuam separados.
- Status aceitos: ativo, férias, ausente, atestado, afastado e desligado. Variações como “de férias”, “em atestado” e “demitido” também são reconhecidas.
- Status em branco preserva o status existente; novos cadastros começam como ativo. Admissão em branco preserva a existente ou cria uma pendência. Pessoas sem admissão não entram na escala até o preenchimento.
- Férias, ausente, atestado e afastado com Inicio/Fim criam períodos inclusivos; após o último dia, volta a valer o status sem período do cadastro. Sem datas, o status bloqueia a escala até ser alterado.
- Na coluna mensal, um status temporário sem datas corresponde ao mês inteiro. Desligamento deve ser informado na coluna Status, não como ausência mensal.
- Desligado é um status geral do cadastro e impede novas alocações. O histórico de escalas é mantido; a validação de escalas já salvas pode apontar conflito e exigir revisão.
- Reenviar períodos idênticos não duplica ausências. Períodos diferentes sobrepostos, admissões conflitantes para o mesmo nome, status desconhecidos e nomes ambíguos impedem a aplicação de todo o arquivo.
- A importação adiciona períodos e preserva os existentes. Para corrigir/remover férias antigas, use Editar atendente; apagar uma célula da planilha não apaga o histórico.

Os dados permanecem somente no navegador usado. A importação não cria contas de login.
