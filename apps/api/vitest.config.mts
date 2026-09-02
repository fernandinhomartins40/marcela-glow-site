import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Só os testes em src/. Sem isto o vitest também acha as cópias compiladas
    // em dist/, que quebram na importação e poluem o resultado com falhas que
    // não existem no código-fonte.
    include: ['src/**/*.test.ts'],
  },
})
