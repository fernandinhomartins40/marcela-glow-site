import { useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, Mail, MapPin, Phone, Plus, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proceduresApi, appointmentsApi, getErrorMessage } from "@/lib/api";
import SlotPicker from "@/components/SlotPicker";
import { useSection } from "@/hooks/useLanding";
import { EM_PREVIA } from "@/lib/previa";
import { FALLBACK_CONTATO, formatPhone } from "@/components/Footer";

interface AppointmentContent {
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  lead: string;
  disclaimer: string;
  whatsapp: string | null;
}

const FALLBACK: AppointmentContent = {
  eyebrow: "Agende sua avaliação",
  titleTop: "Vamos conversar",
  titleBottom: "sobre você.",
  lead: "Entenda as melhores opções para realçar sua beleza e cuidar da sua saúde.",
  disclaimer:
    "Este é um pedido de horário, não uma reserva confirmada. A equipe confere a agenda e entra em contato com você.",
  whatsapp: null,
};

/* O contato vem do Rodapé no painel: é a mesma clínica, e dois lugares para
   o mesmo telefone acabariam divergindo. O horário fica só no rodapé, logo
   abaixo — aqui, como no mockup, só os canais. */
function blocosDeContato(c: { phone: string | null; email: string | null; address: string }) {
  const blocos: { label: string; icon: LucideIcon; lines: string[] }[] = [];
  if (c.phone) blocos.push({ label: "Telefone / WhatsApp", icon: Phone, lines: [formatPhone(c.phone)] });
  if (c.email) blocos.push({ label: "E-mail", icon: Mail, lines: [c.email] });
  if (c.address) blocos.push({ label: "Endereço", icon: MapPin, lines: [c.address] });
  return blocos;
}

const formSteps: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: CalendarClock, title: "Escolha o dia", detail: "e o horário" },
  { icon: UserRound, title: "Suas informações", detail: "Nome e contato" },
  { icon: CheckCircle2, title: "Confirmação", detail: "Feita pela equipe" },
];

/** "quinta-feira, 4 de setembro, às 14:30" — confirma a escolha por extenso */
function formatChosenSlot(startsAt: string) {
  const date = new Date(startsAt);
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day}, às ${time}`;
}

const Appointment = () => {
  const { content, isVisible } = useSection<AppointmentContent>("APPOINTMENT", FALLBACK);
  const { content: contato } = useSection("FOOTER", FALLBACK_CONTATO);
  const contactBlocks = blocosDeContato(contato);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    procedure: "",
    message: "",
  });
  const [slot, setSlot] = useState<string | null>(null);
  /* A observação é opcional e o mockup não a mostra: fica atrás de um link,
     e abre sozinha se já tiver texto. */
  const [showMessage, setShowMessage] = useState(false);
  const [submitted, setSubmitted] = useState<{ name: string; slot: string | null } | null>(null);

  const queryClient = useQueryClient();

  const { data: procedures = [], isPending: proceduresPending, isError: proceduresError } = useQuery({
    queryKey: ["procedures"],
    queryFn: proceduresApi.list,
    staleTime: 5 * 60 * 1000,
  });

  // O select guarda o título; o cálculo de horários precisa do id do procedimento
  const selectedProcedureId = procedures.find((p) => p.title === formData.procedure)?.id;

  const mutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      setSubmitted({ name: formData.name, slot });
      toast.success(
        slot
          ? "Horário solicitado! Entraremos em contato para confirmar."
          : "Solicitação enviada com sucesso! Entraremos em contato em breve.",
      );
      setFormData({ name: "", email: "", phone: "", procedure: "", message: "" });
      setSlot(null);
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mutation.isPending) return;
    /* Na prévia do painel o formulário é de mentira: enviar criaria um pedido
       de horário de verdade na agenda. */
    if (EM_PREVIA) {
      toast.info("Na prévia o envio fica desligado — no site ele funciona normalmente.");
      return;
    }

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    mutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      procedure: formData.procedure.trim() || undefined,
      message: formData.message.trim() || undefined,
      scheduledAt: slot || undefined,
    });
  };

  const fieldClass =
    "bg-[hsl(var(--cream))]/[0.04] border border-[hsl(var(--cream))]/25 rounded-[3px] px-3.5 h-11 text-[hsl(var(--cream))] placeholder:text-[hsl(var(--cream))]/50 focus-visible:ring-1 focus-visible:ring-[hsl(var(--bronze-light))] focus-visible:ring-offset-0 focus-visible:border-[hsl(var(--bronze-light))] transition-colors duration-300";

  const startAnotherRequest = () => {
    setSubmitted(null);
    setFormData({ name: "", email: "", phone: "", procedure: "", message: "" });
    setSlot(null);
  };

  if (!isVisible) return null;

  return (
    <section
      id="agendamento"
      className="relative bg-espresso overflow-hidden py-14 md:py-16"
    >

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Coluna de informações */}
          <div className="lg:col-span-5 min-w-0 animate-fade-in">
            <p className="label-eyebrow label-rule mb-4">{content.eyebrow}</p>
            <h2 className="font-display text-[clamp(2.2rem,3.6vw,3rem)] leading-[1.02] text-[hsl(var(--cream))]">
              {content.titleTop}
              <span className="block italic font-light text-[hsl(var(--bronze-light))]">
                {content.titleBottom}
              </span>
            </h2>

            <p className="mt-4 mb-7 max-w-md text-base leading-relaxed text-[hsl(var(--cream))]/80">
              {content.lead}
            </p>

            <ul className="space-y-4">
              {contactBlocks.map(({ label, icon: Icon, lines }) => (
                <li key={label} className="flex items-start gap-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--bronze-light))]" strokeWidth={1.4} aria-hidden="true" />
                  <div>
                    <p className="sr-only">{label}</p>
                    {lines.map((line, i) => (
                      <p key={line} className={`text-[0.95rem] leading-relaxed ${i === 0 ? "text-[hsl(var(--cream))]/90" : "text-[hsl(var(--cream))]/75"}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Formulário */}
          <div className="lg:col-span-7 min-w-0 animate-fade-in">
            {submitted ? (
              <section
                className="rounded-md border border-[hsl(var(--cream))]/20 bg-[hsl(var(--cream))]/[0.04] p-6 sm:p-8 md:p-10"
                aria-live="polite"
              >
                <CheckCircle2 className="h-8 w-8 text-[hsl(var(--bronze-light))]" aria-hidden="true" />
                <p className="label-eyebrow mt-6">Solicitação recebida</p>
                <h3 className="mt-3 font-display text-3xl text-[hsl(var(--cream))] sm:text-4xl">
                  Obrigada, {submitted.name.split(" ")[0]}.
                </h3>
                <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-[hsl(var(--cream))]/75">
                  {submitted.slot
                    ? `Registramos sua preferência para ${formatChosenSlot(submitted.slot)}.`
                    : "Registramos seu pedido de avaliação."}{" "}
                  A equipe vai conferir a agenda e falar com você para confirmar.
                </p>
                <ol className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    [ClipboardCheck, "Pedido recebido", "Sua solicitação já chegou à equipe."],
                    [Clock3, "Confirmação", "A equipe confere a agenda e entra em contato."],
                    [UserRound, "Acompanhamento", "Se tiver acesso, acompanhe também pela Área da Paciente."],
                  ].map(([Icon, title, description]) => {
                    const StepIcon = Icon as typeof CheckCircle2;
                    return (
                      <li key={title as string} className="border border-[hsl(var(--cream))]/12 p-4">
                        <StepIcon className="h-4 w-4 text-[hsl(var(--bronze-light))]" aria-hidden="true" />
                        <strong className="mt-4 block text-sm font-medium text-[hsl(var(--cream))]">{title as string}</strong>
                        <span className="mt-1.5 block text-xs leading-relaxed text-[hsl(var(--cream))]/55">{description as string}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <a href="/paciente/?criar-acesso=1" className="inline-flex min-h-11 items-center border border-[hsl(var(--cream))]/30 px-4 text-sm text-[hsl(var(--cream))] transition-colors hover:border-[hsl(var(--cream))] hover:bg-[hsl(var(--cream))] hover:text-[hsl(var(--espresso))]">
                    Criar acesso e acompanhar pedido
                  </a>
                  <button type="button" onClick={startAnotherRequest} className="text-sm text-[hsl(var(--cream))]/65 underline underline-offset-4 hover:text-[hsl(var(--cream))]">
                    Fazer outra solicitação
                  </button>
                </div>
              </section>
            ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-md border border-[hsl(var(--cream))]/15 bg-[hsl(var(--cream))]/[0.03] p-5 sm:p-6"
            >
              <p className="label-eyebrow mb-4">Solicite sua avaliação</p>

              <ol className="grid gap-3 border-b border-[hsl(var(--cream))]/10 pb-4 sm:grid-cols-3 sm:gap-0">
                {formSteps.map(({ icon: Icon, title, detail }, index) => (
                  <li key={title} className={`flex items-center gap-2.5 sm:px-3 ${index > 0 ? "sm:border-l sm:border-[hsl(var(--cream))]/15" : "sm:pl-0"}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--cream))]/10 text-[hsl(var(--bronze-light))]">
                      <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="leading-tight">
                      <strong className="block text-[0.8125rem] font-medium text-[hsl(var(--cream))]">{title}</strong>
                      <span className="block text-xs text-[hsl(var(--cream))]/70">{detail}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="appointment-name" className="mb-1.5 block text-xs text-[hsl(var(--cream))]/80">
                    Nome completo <span className="text-[hsl(var(--bronze-light))]">*</span>
                  </label>
                  <Input
                    id="appointment-name"
                    type="text"
                    placeholder="Como prefere ser chamada"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={120}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="appointment-phone" className="mb-1.5 block text-xs text-[hsl(var(--cream))]/80">
                    WhatsApp <span className="text-[hsl(var(--bronze-light))]">*</span>
                  </label>
                  <Input
                    id="appointment-phone"
                    type="tel"
                    placeholder="(67) 90000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={40}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <p className="mb-1.5 block text-xs text-[hsl(var(--cream))]/80">Procedimento <span className="text-[hsl(var(--cream))]/55">(opcional)</span></p>
                  {proceduresPending || proceduresError || procedures.length === 0 ? (
                    <p className={`${fieldClass} flex items-center text-sm text-[hsl(var(--cream))]/70`} role="status">
                      {proceduresPending ? "Carregando procedimentos…" : "Conte seu interesse na observação"}
                    </p>
                  ) : <Select
                    value={formData.procedure}
                    onValueChange={(value) => setFormData({ ...formData, procedure: value })}
                  >
                    <SelectTrigger className={fieldClass} aria-label="Procedimento de interesse">
                      <SelectValue placeholder="Quero conversar sobre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {procedures.map((p) => (
                        <SelectItem key={p.id} value={p.title}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>}
                </div>
                <div>
                  <label htmlFor="appointment-email" className="mb-1.5 block text-xs text-[hsl(var(--cream))]/80">
                    E-mail <span className="text-[hsl(var(--bronze-light))]">*</span>
                  </label>
                  <Input
                    id="appointment-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={254}
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-xs text-[hsl(var(--cream))]/80">
                    Selecione a data e horário <span className="text-[hsl(var(--cream))]/55">(opcional)</span>
                  </p>
                  {slot && (
                    <button
                      type="button"
                      onClick={() => setSlot(null)}
                      className="text-xs text-[hsl(var(--cream))]/70 underline underline-offset-4 hover:text-[hsl(var(--cream))]"
                    >
                      limpar
                    </button>
                  )}
                </div>
                <SlotPicker procedureId={selectedProcedureId} value={slot} onChange={setSlot} />
                {slot && (
                  <p className="mt-2 text-sm text-[hsl(var(--cream))]/80">
                    Você escolheu <span className="text-[hsl(var(--cream))]">{formatChosenSlot(slot)}</span>.
                  </p>
                )}
              </div>

              {showMessage || formData.message ? (
                <div className="mt-4">
                  <label htmlFor="appointment-message" className="mb-1.5 block text-xs text-[hsl(var(--cream))]/80">
                    Algo que a equipe deve saber <span className="text-[hsl(var(--cream))]/55">(opcional)</span>
                  </label>
                  <Textarea
                    id="appointment-message"
                    placeholder="Preferência de dia, horário ou uma dúvida"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    maxLength={4000}
                    autoFocus={showMessage && !formData.message}
                    className={`${fieldClass} scrollbar-on-dark h-auto min-h-[88px] py-3 resize-none`}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMessage(true)}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-[hsl(var(--cream))]/75 hover:text-[hsl(var(--cream))]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar uma observação
                </button>
              )}

              <Button
                type="submit"
                variant="ctaLight"
                size="lg"
                className="mt-4 w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Enviando..." : <>Solicitar agendamento <ArrowRight aria-hidden="true" /></>}
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--cream))]/65">
                {content.disclaimer} Usaremos seus dados só para responder a este pedido. * Obrigatório.
              </p>
            </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Appointment;
