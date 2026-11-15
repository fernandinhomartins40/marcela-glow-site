import { z } from 'zod'

/**
 * Política de privacidade: uma seção da landing que não aparece na página
 * inicial, e sim em `/privacidade` no site. É o endereço que vai nas lojas.
 *
 * Os dados de quem responde pelos dados (controlador, encarregado e
 * desenvolvedor) ficam separados do texto: o texto padrão fala em "a clínica"
 * e "o desenvolvedor", e a página põe os nomes no quadro do topo. Assim trocar
 * o CNPJ não exige reescrever a política.
 *
 * Campo vazio é permitido de propósito — o painel avisa enquanto faltar o
 * documento da clínica ou o contato do encarregado, e a página omite o vazio.
 */

const opcional = (max: number) => z.string().trim().max(max).default('')
const emailOpcional = z.union([z.literal(''), z.string().trim().email().max(120)]).default('')

export const privacySchema = z.object({
  controller: z
    .object({
      name: opcional(160),
      document: opcional(30),
      address: opcional(240),
      email: emailOpcional,
      phone: opcional(30),
    })
    .default({}),
  dpo: z
    .object({
      name: opcional(120),
      email: emailOpcional,
    })
    .default({}),
  developer: z
    .object({
      name: opcional(160),
      document: opcional(30),
      email: emailOpcional,
      site: opcional(160),
    })
    .default({}),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(120),
        /** Texto puro. Linha em branco separa parágrafos; linha que começa com "- " vira item de lista. */
        body: z.string().trim().min(2).max(6000),
      }),
    )
    .min(1)
    .max(30),
})

const SECOES_PADRAO = [
  {
    title: 'Quem somos e a quem esta política se aplica',
    body: `Esta política explica como tratamos os dados pessoais de quem visita o site, pede um horário, usa o portal ou o aplicativo da paciente e é atendida na clínica, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a "LGPD").

A clínica identificada no quadro acima é a controladora dos dados: é ela quem decide quais dados são coletados e para quê. O desenvolvedor do sistema atua como operador, tratando os dados apenas em nome da clínica e segundo as instruções dela.`,
  },
  {
    title: 'Quais dados coletamos',
    body: `- Identificação e contato: nome, nome social, e-mail, telefone, data de nascimento, CPF, RG, endereço e contato de emergência.
- Agendamento: data e horário pedidos, procedimento de interesse e a mensagem que você escreve no formulário.
- Dados de saúde: prontuário, anamnese, alergias, medicamentos em uso, condições e cirurgias anteriores, procedimentos realizados, planos de tratamento, receitas, atestados e fotografias clínicas.
- Uso do portal e do aplicativo: data do último acesso, registros técnicos de acesso (endereço IP, data e hora) e, se você permitir notificações, um identificador do aparelho para enviá-las.

Dados de saúde são dados pessoais sensíveis e recebem a proteção reforçada do art. 11 da LGPD.`,
  },
  {
    title: 'Para que usamos os dados',
    body: `- Agendar, confirmar, remarcar e lembrar consultas e procedimentos.
- Prestar o atendimento médico e registrar o prontuário, como exige a legislação e o Conselho Federal de Medicina.
- Mostrar a você, no portal e no aplicativo, sua jornada de tratamento, documentos e avisos da clínica.
- Enviar notificações e e-mails sobre o seu atendimento, como confirmação de horário e ativação de conta.
- Emitir cobranças e cumprir obrigações fiscais.
- Manter a segurança do sistema e prevenir fraudes e acessos indevidos.

Não vendemos dados pessoais e não os usamos para publicidade de terceiros.`,
  },
  {
    title: 'Bases legais',
    body: `- Dados de saúde: tutela da saúde, em procedimento realizado por profissional de saúde (art. 11, II, "f"), e cumprimento de obrigação legal ou regulatória (art. 11, II, "a"), como a guarda do prontuário.
- Dados de cadastro e agendamento: execução do atendimento que você pediu (art. 7º, V) e cumprimento de obrigação legal (art. 7º, II).
- Registros de acesso: obrigação legal (Marco Civil da Internet, art. 15) e legítimo interesse na segurança do sistema (art. 7º, IX).
- Uso de fotografias fora do prontuário, como em divulgação de resultados: somente com o seu consentimento específico e por escrito (art. 11, I), que pode ser revogado a qualquer momento.`,
  },
  {
    title: 'Com quem compartilhamos',
    body: `Os dados são acessados apenas pela equipe da clínica, cada pessoa conforme a sua função: a recepção não acessa o prontuário, por exemplo. Também passam por fornecedores necessários para o sistema funcionar, todos obrigados a protegê-los:

- o desenvolvedor do sistema, como operador;
- o provedor de hospedagem do servidor e do armazenamento de arquivos;
- o provedor de envio de e-mails;
- o Google (Firebase Cloud Messaging) e a Apple (Apple Push Notification service), apenas para entregar notificações ao seu aparelho, com o identificador do aparelho e o texto do aviso.

Podemos ainda informar dados a autoridades quando a lei ou uma ordem judicial exigir.`,
  },
  {
    title: 'Transferência internacional',
    body: `Alguns fornecedores, como os serviços de notificação do Google e da Apple, podem processar dados fora do Brasil. Nesses casos a transferência segue o art. 33 da LGPD, com fornecedores que adotam garantias de proteção compatíveis com a lei brasileira.`,
  },
  {
    title: 'Por quanto tempo guardamos',
    body: `- Prontuário e documentos clínicos: pelo prazo mínimo de 20 anos a partir do último registro, conforme a Lei nº 13.787/2018 e as normas do Conselho Federal de Medicina.
- Registros de acesso: por 6 meses, conforme o Marco Civil da Internet.
- Dados fiscais e de cobrança: pelo prazo exigido pela legislação tributária.
- Pedidos de horário que não viraram atendimento e demais dados de cadastro: enquanto forem necessários para a finalidade, e depois são eliminados ou anonimizados.`,
  },
  {
    title: 'Seus direitos',
    body: `Você pode, a qualquer momento e sem custo (art. 18 da LGPD):

- confirmar se tratamos seus dados e acessá-los;
- corrigir dados incompletos, inexatos ou desatualizados;
- pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade com a lei;
- pedir a portabilidade dos dados;
- saber com quem os compartilhamos;
- revogar um consentimento que tenha dado;
- apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).

Para exercer esses direitos, escreva ao encarregado indicado no quadro acima. Responderemos no prazo da lei. Dados que a lei obriga a guardar, como o prontuário, não podem ser eliminados antes do prazo legal, mas você continua podendo acessá-los e pedir cópia.`,
  },
  {
    title: 'Como excluir a sua conta',
    body: `No aplicativo e no portal, em "Excluir minha conta", você encerra o seu acesso: a senha é apagada, as sessões abertas são encerradas e o aparelho deixa de receber notificações.

O prontuário e os registros do atendimento continuam guardados pelo prazo legal, porque a clínica é obrigada a mantê-los. Para pedir a eliminação dos demais dados de cadastro, escreva ao encarregado.`,
  },
  {
    title: 'Segurança',
    body: `Usamos conexão criptografada (HTTPS), senhas guardadas de forma irreversível, controle de acesso por função, registro de quem acessou ou alterou cada dado e cópias de segurança. Nenhum sistema é totalmente imune a incidentes; se um incidente puder trazer risco relevante a você, comunicaremos você e a ANPD, como manda a lei.`,
  },
  {
    title: 'Cookies e armazenamento no aparelho',
    body: `O site e os aplicativos não usam cookies de publicidade nem ferramentas de rastreamento de terceiros. Guardamos no seu navegador ou aparelho apenas o necessário para funcionar, como a sua sessão de acesso ao portal.`,
  },
  {
    title: 'Crianças e adolescentes',
    body: `O atendimento de menores de 18 anos e o cadastro dos seus dados são feitos com o consentimento e o acompanhamento de um dos pais ou do responsável legal, no melhor interesse do menor (art. 14 da LGPD).`,
  },
  {
    title: 'Alterações desta política',
    body: `Esta política pode ser atualizada. A data da última atualização aparece no topo da página. Mudanças relevantes serão avisadas no portal e no aplicativo.`,
  },
]

export const PRIVACY_DEFAULT: z.input<typeof privacySchema> = {
  controller: {
    name: 'Dra. Marcela Campanini Duch',
    document: '',
    address: 'Chapadão do Sul/MS',
    email: '',
    phone: '',
  },
  dpo: { name: '', email: '' },
  developer: { name: '', document: '', email: '', site: '' },
  sections: SECOES_PADRAO,
}
