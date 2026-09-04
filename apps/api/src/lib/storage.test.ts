import { describe, expect, it } from 'vitest'
import { buildStorageKey, publicFileUrl } from './storage'

/**
 * A chave do arquivo é o que separa o que uma clínica guarda do que a outra vê,
 * e o que impede um nome de arquivo vindo do navegador de escapar da pasta.
 * Erro aqui não aparece em tela: o upload conclui e o arquivo vai para o lugar
 * errado — ou sobrescreve outro.
 */
describe('buildStorageKey', () => {
  it('começa pelo tenant, isolando uma clínica da outra', () => {
    expect(buildStorageKey('clinica-a', 'foto.jpg').startsWith('clinica-a/')).toBe(true)
  })

  it('troca acento e espaço por caractere seguro', () => {
    const key = buildStorageKey('t1', 'evolução da paciente.jpg')

    expect(key).not.toContain(' ')
    expect(key).toMatch(/^[A-Za-z0-9._/-]+$/)
    expect(key.endsWith('.jpg')).toBe(true)
  })

  it('neutraliza tentativa de subir de pasta pelo nome do arquivo', () => {
    // O nome chega do navegador: "../" no meio dele nao pode virar caminho.
    const key = buildStorageKey('t1', '../../etc/passwd')

    expect(key).not.toContain('../')
    expect(key.startsWith('t1/')).toBe(true)
    // Sobra exatamente uma barra por nivel proprio da chave: tenant/data/arquivo
    expect(key.split('/')).toHaveLength(3)
  })

  it('não gera a mesma chave para dois envios do mesmo nome', () => {
    // Sem isto, a segunda foto sobrescreveria a primeira em silêncio.
    const a = buildStorageKey('t1', 'foto.jpg')
    const b = buildStorageKey('t1', 'foto.jpg')

    expect(a).not.toBe(b)
  })

  it('corta nome muito longo mantendo a extensão', () => {
    const key = buildStorageKey('t1', 'a'.repeat(300) + '.pdf')

    expect(key.endsWith('.pdf')).toBe(true)
    expect(key.length).toBeLessThan(200)
  })
})

describe('publicFileUrl', () => {
  it('preserva a chave no fim da URL', () => {
    // A configuração é lida na importação do módulo, então aqui só dá para
    // afirmar o que vale em qualquer ambiente: a chave sai inteira e no fim.
    // Se a base estiver errada, isso aparece no Passo 2 (upload real), não aqui.
    const chave = 't1/2026-09-02/abc-foto.jpg'

    expect(publicFileUrl(chave).endsWith(chave)).toBe(true)
  })
})

/**
 * O prefixo decide o que abre sem assinatura. Errar aqui não aparece em tela:
 * um anexo clínico gravado como público fica legível a quem tiver o link.
 */
describe('prefixo público', () => {
  it('mantém arquivo comum fora do prefixo público', () => {
    expect(buildStorageKey('t1', 'exame.pdf').startsWith('public/')).toBe(false)
  })

  it('põe no prefixo público só quando pedido', () => {
    expect(buildStorageKey('t1', 'logo.png', { publico: true }).startsWith('public/t1/')).toBe(true)
  })

  it('não deixa o nome do arquivo escapar do prefixo', () => {
    // Nome vindo do navegador não pode reposicionar a chave para fora de public/.
    const chave = buildStorageKey('t1', '../../privado/roubo.pdf', { publico: true })
    expect(chave.startsWith('public/t1/')).toBe(true)
    expect(chave).not.toContain('../')
  })
})
