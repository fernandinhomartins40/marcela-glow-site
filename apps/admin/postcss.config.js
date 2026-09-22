/* O painel usa CSS proprio (`src/styles.css`), nao Tailwind.
 *
 * O plugin do Tailwind estava aqui e o `tailwind.config.ts` tinha 118 linhas de
 * cores, breakpoints e animacoes — mas o CSS nunca teve as diretivas
 * `@tailwind`, entao **nenhuma classe utilitaria era gerada**. A unica que o
 * JSX usava (`inline-flex items-center gap-1`, no telefone da recepcao) nao
 * estilizava nada, e o icone ficava desalinhado do numero.
 *
 * O autoprefixer fica: ele tem efeito real no CSS publicado.
 */
export default {
  plugins: {
    autoprefixer: {},
  },
};
