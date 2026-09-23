import { useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, Mail, MapPin, Phone, UserRound } from "lucide-react";
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

const contactBlocks: { label: string; icon: LucideIcon; lines: string[] }[] = [
  { label: "Telefone / WhatsApp", icon: Phone, lines: ["(67) 99944-6066"] },
  { label: "E-mail", icon: Mail, lines: ["contato@dramarceladuch.com.br"] },
  { label: "Endereço", icon: MapPin, lines: ["Av. 16, nº 890 — Ágatha Center", "Chapadão do Sul — MS"] },
  { label: "Atendimento", icon: Clock3, lines: ["Segunda a sexta · 9h às 18h", "Sábado · 9h às 13h"] },
];

/* As três etapas na ordem em que o formulário as pede. */
const formSteps: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: UserRound, title: "Suas informações", detail: "Nome e contato" },
  { icon: CalendarClock, title: "Dia e horário", detail: "Se tiver preferência" },
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    procedure: "",
    message: "",
  });
  const [slot, setSlot] = useState<string | null>(null);
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
    "bg-[hsl(var(--cream))]/[0.04] border border-[hsl(var(--cream))]/25 rounded-[3px] px-3.5 h-12 text-[hsl(var(--cream))] placeholder:text-[hsl(var(--cream))]/50 focus-visible:ring-1 focus-visible:ring-[hsl(var(--bronze-light))] focus-visible:ring-offset-0 focus-visible:border-[hsl(var(--bronze-light))] transition-colors duration-300";

  const startAnotherRequest = () => {
    setSubmitted(null);
    setFormData({ name: "", email: "", phone: "", procedure: "", message: "" });
    setSlot(null);
  };

  if (!isVisible) return null;

  return (
    <section
      id="agendamento"
      className="relative section-y bg-espresso overflow-hidden"
    >

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-20 max-w-6xl mx-auto">
          {/* Coluna de informações */}
          <div className="lg:col-span-5 min-w-0 animate-fade-in">
            <p className="label-eyebrow mb-4">{content.eyebrow}</p>
            <h2 className="font-display type-section text-[hsl(var(--cream))]">
              {content.titleTop}
              <span className="block italic font-light text-[hsl(var(--bronze-light))]">
                {content.titleBottom}
              </span>
            </h2>

            <p className="mt-5 mb-9 max-w-md text-base leading-relaxed text-[hsl(var(--cream))]/80 md:mb-12">
              {content.lead}
            </p>

            <ul className="space-y-5">
              {contactBlocks.map(({ label, icon: Icon, lines }) => (
                <li key={label} className="flex items-start gap-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--bronze-light))]" strokeWidth={1.4} aria-hidden="true" />
                  <div>
                    <p className="sr-only">{label}</p>
                    {lines.map((line) => (
                      <p key={line} className="text-[0.95rem] leading-relaxed text-[hsl(var(--cream))]/90">
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
              className="rounded-md border border-[hsl(var(--cream))]/15 bg-[hsl(var(--cream))]/[0.03] p-5 sm:p-8 md:p-10"
            >
              <p className="label-eyebrow mb-6">Solicite sua avaliação</p>

              <ol className="grid gap-4 border-b border-[hsl(var(--cream))]/10 pb-6 sm:grid-cols-3 sm:gap-3">
                {formSteps.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--bronze-light))]/50 text-[hsl(var(--bronze-light))]">
                      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="block text-sm font-medium text-[hsl(var(--cream))]">{title}</strong>
                      <span className="block text-xs text-[hsl(var(--cream))]/70">{detail}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-7 space-y-6">
                <div>
                  <label htmlFor="appointment-name" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/80">
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

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="appointment-email" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/80">
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
                  <div>
                    <label htmlFor="appointment-phone" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/80">
                      Telefone ou WhatsApp <span className="text-[hsl(var(--bronze-light))]">*</span>
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
                </div>

                <div>
                  <p className="mb-2 text-xs tracking-wide text-[hsl(var(--cream))]/80">Procedimento de interesse <span className="text-[hsl(var(--cream))]/45">(opcional)</span></p>
                  {proceduresPending || proceduresError || procedures.length === 0 ? (
                    <p className="border-b border-[hsl(var(--cream))]/25 py-3 text-sm text-[hsl(var(--cream))]/65" role="status">
                      {proceduresPending
                        ? "Carregando procedimentos…"
                        : "A lista de procedimentos não está disponível agora. Descreva seu interesse no campo abaixo; você ainda pode pedir uma avaliação."}
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
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="label-eyebrow">
                      Horário de preferência
                      <span className="ml-2 normal-case tracking-normal text-[hsl(var(--cream))]/40">
                        (opcional)
                      </span>
                    </p>
                    {slot && (
                      <button
                        type="button"
                        onClick={() => setSlot(null)}
                        className="text-xs tracking-wide text-[hsl(var(--cream))]/50 underline underline-offset-4 transition-colors hover:text-[hsl(var(--cream))]"
                      >
                        limpar
                      </button>
                    )}
                  </div>

                  <SlotPicker
                    procedureId={selectedProcedureId}
                    value={slot}
                    onChange={setSlot}
                    disclaimer={content.disclaimer}
                  />

                  {slot && (
                    <p className="mt-3 flex items-start gap-2.5 text-sm font-light text-[hsl(var(--cream))]/75">
                      <span className="mt-2 h-px w-5 shrink-0 bg-[hsl(var(--bronze))]" />
                      <span>
                        Você escolheu{" "}
                        <span className="text-[hsl(var(--cream))]">
                          {formatChosenSlot(slot)}
                        </span>
                        .
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="appointment-message" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/80">
                    Algo que a equipe deve saber <span className="text-[hsl(var(--cream))]/45">(opcional)</span>
                  </label>
                  <Textarea
                    id="appointment-message"
                    placeholder="Preferência de dia, horário ou uma dúvida"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    maxLength={4000}
                    className={`${fieldClass} scrollbar-on-dark h-auto min-h-[110px] py-3 resize-none`}
                  />
                </div>

                <p className="text-xs leading-relaxed text-[hsl(var(--cream))]/50 font-light">
                  * Campos obrigatórios. Usaremos seus dados para responder a este pedido de avaliação.
                </p>

                <Button
                  type="submit"
                  variant="ctaLight"
                  size="lg"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Enviando..." : <>Solicitar avaliação <ArrowRight aria-hidden="true" /></>}
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Appointment;
