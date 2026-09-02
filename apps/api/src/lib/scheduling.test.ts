import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  clinicTimeToUtc,
  clinicWeekday,
  utcToClinicDate,
  utcToClinicTime,
} from './scheduling'

/**
 * Fuso é onde erro de agenda passa despercebido: nada quebra, a consulta só
 * aparece na hora errada. O servidor roda em UTC e a clínica em
 * America/Campo_Grande (UTC-4, sem horário de verão desde 2019), então toda
 * conversão precisa atravessar essa diferença sem depender do relógio da máquina.
 */
describe('conversão entre hora da clínica e UTC', () => {
  it('desloca a hora local para UTC pela diferença do fuso', () => {
    const utc = clinicTimeToUtc('2026-08-12', '14:30')

    // 14:30 em Campo Grande (UTC-4) é 18:30 UTC
    expect(utc.toISOString()).toBe('2026-08-12T18:30:00.000Z')
  })

  it('volta de UTC para a data e a hora que a clínica vê', () => {
    const instante = new Date('2026-08-12T18:30:00.000Z')

    expect(utcToClinicDate(instante)).toBe('2026-08-12')
    expect(utcToClinicTime(instante)).toBe('14:30')
  })

  it('mantém a data da clínica quando o UTC já virou o dia', () => {
    // 22:00 local do dia 12 é 02:00 UTC do dia 13: a agenda tem de continuar
    // mostrando o dia 12, senão o atendimento pula de data no painel.
    const instante = clinicTimeToUtc('2026-08-12', '22:00')

    expect(instante.toISOString()).toBe('2026-08-13T02:00:00.000Z')
    expect(utcToClinicDate(instante)).toBe('2026-08-12')
  })

  it('faz a ida e a volta sem perder o horário', () => {
    for (const hora of ['08:00', '12:00', '17:45', '23:15']) {
      const ida = clinicTimeToUtc('2026-03-01', hora)
      expect(utcToClinicTime(ida)).toBe(hora)
    }
  })
})

describe('clinicWeekday', () => {
  it('identifica o dia da semana na data local', () => {
    // 2026-08-12 é uma quarta-feira
    expect(clinicWeekday('2026-08-12')).toBe(3)
    // 2026-08-16 é um domingo
    expect(clinicWeekday('2026-08-16')).toBe(0)
  })
})

describe('addDaysISO', () => {
  it('soma dias dentro do mês', () => {
    expect(addDaysISO('2026-08-12', 3)).toBe('2026-08-15')
  })

  it('atravessa a virada de mês', () => {
    expect(addDaysISO('2026-08-30', 3)).toBe('2026-09-02')
  })

  it('atravessa a virada de ano', () => {
    expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('trata fevereiro de ano bissexto', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('anda para trás com valor negativo', () => {
    expect(addDaysISO('2026-09-02', -3)).toBe('2026-08-30')
  })
})
