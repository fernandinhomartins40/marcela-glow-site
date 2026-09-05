/**
 * Campos automáticos dos modelos de documento.
 *
 * A médica escreve `{{paciente}}` no texto do modelo e o sistema troca pelo
 * valor real na hora de emitir. É o que permite um atestado pronto servir a
 * qualquer paciente sem reescrever a frase.
 *
 * A lista vive aqui porque três lugares precisam concordar sobre ela: o menu
 * que insere o campo no editor, a prévia que mostra um exemplo, e a impressão
 * que faz a troca de verdade.
 */

export interface DocField {
  /** Sem chaves: o que vai dentro de {{ }} */
  key: string
  label: string
  /** Valor mostrado na prévia, para a folha não ficar cheia de chaves */
  sample: string
  group: 'paciente' | 'clinico' | 'atendimento' | 'documento' | 'clinica'
}

export const DOC_FIELDS: DocField[] = [
  { key: 'paciente', label: 'Nome da paciente', sample: 'Ana Beatriz Moraes', group: 'paciente' },
  { key: 'paciente_cpf', label: 'CPF da paciente', sample: '100.000.000-19', group: 'paciente' },
  { key: 'paciente_nascimento', label: 'Data de nascimento', sample: '12/03/1992', group: 'paciente' },
  { key: 'paciente_idade', label: 'Idade', sample: '34 anos', group: 'paciente' },
  { key: 'paciente_endereco', label: 'Endereço da paciente', sample: 'Chapadão do Sul/MS', group: 'paciente' },

  { key: 'paciente_rg', label: 'RG da paciente', sample: '12.345.678-9', group: 'paciente' },
  { key: 'paciente_telefone', label: 'Telefone da paciente', sample: '(67) 98001-6042', group: 'paciente' },
  { key: 'paciente_email', label: 'E-mail da paciente', sample: 'ana.beatriz@exemplo.com.br', group: 'paciente' },
  { key: 'paciente_profissao', label: 'Profissão', sample: 'Advogada', group: 'paciente' },

  // Dados clínicos — o que precisa constar num atestado ou antes de prescrever.
  { key: 'alergias', label: 'Alergias', sample: 'Dipirona, Látex', group: 'clinico' },
  { key: 'medicacoes', label: 'Medicações em uso', sample: 'Losartana 50mg', group: 'clinico' },
  { key: 'comorbidades', label: 'Comorbidades', sample: 'Hipertensão', group: 'clinico' },
  { key: 'tipo_sanguineo', label: 'Tipo sanguíneo', sample: 'O+', group: 'clinico' },
  { key: 'tipo_pele', label: 'Tipo de pele', sample: 'Fototipo III', group: 'clinico' },

  // Atendimento — vem da consulta em que o documento está sendo emitido.
  { key: 'atendimento_data', label: 'Data do atendimento', sample: '04/09/2026', group: 'atendimento' },
  { key: 'atendimento_hora', label: 'Hora do atendimento', sample: '14:00', group: 'atendimento' },
  { key: 'atendimento_duracao', label: 'Duração', sample: '60 min', group: 'atendimento' },
  { key: 'queixa', label: 'Queixa principal', sample: 'Linhas de expressão na testa', group: 'atendimento' },
  { key: 'conduta', label: 'Conduta', sample: 'Retorno em 30 dias', group: 'atendimento' },

  { key: 'data', label: 'Data de hoje', sample: '04/09/2026', group: 'documento' },
  { key: 'data_extenso', label: 'Data por extenso', sample: '4 de setembro de 2026', group: 'documento' },
  { key: 'hora', label: 'Hora', sample: '14:30', group: 'documento' },
  { key: 'procedimento', label: 'Procedimento', sample: 'Toxina botulínica', group: 'documento' },
  { key: 'validade', label: 'Válida até', sample: '04/10/2026', group: 'documento' },
  { key: 'codigo_verificacao', label: 'Código de verificação', sample: 'A1B2-C3D4', group: 'documento' },

  { key: 'medico', label: 'Nome da médica', sample: 'Dra. Marcela Duch', group: 'clinica' },
  { key: 'medico_registro', label: 'CRM', sample: 'CRM/MS 12345', group: 'clinica' },
  { key: 'clinica', label: 'Nome da clínica', sample: 'Clínica Dra. Marcela Duch', group: 'clinica' },
  { key: 'clinica_endereco', label: 'Endereço da clínica', sample: 'Av. 16, nº 890 — Chapadão do Sul/MS', group: 'clinica' },
  { key: 'clinica_telefone', label: 'Telefone', sample: '(67) 99944-6066', group: 'clinica' },
]

export const GROUP_LABEL: Record<DocField['group'], string> = {
  paciente: 'Paciente',
  clinico: 'Dados clínicos',
  atendimento: 'Atendimento',
  documento: 'Documento',
  clinica: 'Clínica',
}

/** Como o campo aparece escrito no texto do modelo. */
export function fieldToken(key: string): string {
  return `{{${key}}}`
}

/**
 * Troca os campos pelos valores.
 *
 * Campo desconhecido ou sem valor sai como texto vazio, nunca como `{{algo}}`:
 * um documento impresso com chaves à mostra é pior que um espaço em branco.
 */
export function applyFields(html: string, values: Record<string, string | null | undefined>): string {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => values[key.toLowerCase()] ?? '')
}

/** Valores de exemplo, para a prévia mostrar a folha como ela sairá. */
export function sampleValues(): Record<string, string> {
  return Object.fromEntries(DOC_FIELDS.map((f) => [f.key, f.sample]))
}
