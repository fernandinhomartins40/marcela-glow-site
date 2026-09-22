import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock3, UserRound } from "lucide-react";
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
  eyebrow: "Primeiro passo",
  titleTop: "Agende sua",
  titleBottom: "avaliação.",
  lead: "Entenda qual protocolo faz sentido para o seu momento.",
  disclaimer:
    "O horário fica reservado como solicitação até a equipe confirmar — você recebe o aviso por WhatsApp e na Área da Paciente.",
  whatsapp: null,
};

const contactBlocks = [
  {
    label: "Telefone / WhatsApp",
    lines: ["(67) 99944-6066"],
  },
  {
    label: "E-mail",
    lines: ["contato@dramarceladuch.com.br"],
  },
  {
    label: "Endereço",
    lines: ["Av. 16, nº 890 — Ágatha Center", "Chapadão do Sul — MS"],
  },
  {
    label: "Atendimento",
    lines: ["Segunda a sexta · 9h às 18h", "Sábado · 9h às 13h"],
  },
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

  const { data: procedures = [] } = useQuery({
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

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    mutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      procedure: formData.procedure || undefined,
      message: formData.message || undefined,
      scheduledAt: slot || undefined,
    });
  };

  const fieldClass =
    "bg-transparent border-0 border-b border-[hsl(var(--cream))]/25 rounded-none px-0 h-12 text-[hsl(var(--cream))] placeholder:text-[hsl(var(--cream))]/45 focus-visible:ring-0 focus-visible:border-[hsl(var(--bronze))] transition-colors duration-500";

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
      {/* Watermark */}
      <span
        className="absolute -bottom-8 left-1/2 hidden -translate-x-1/2 font-display text-[16vw] lg:text-[11vw] pointer-events-none select-none whitespace-nowrap md:block"
        style={{ color: "hsl(var(--cream) / 0.05)" }}
      >
        agendar
      </span>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-20 max-w-6xl mx-auto">
          {/* Coluna de informações */}
          <div className="lg:col-span-5 min-w-0 animate-fade-in">
            <p className="label-eyebrow mb-4 md:mb-5">{content.eyebrow}</p>
            <h2 className="font-display type-section text-[hsl(var(--cream))]">
              {content.titleTop}
              <span className="block italic font-light text-[hsl(var(--bronze-light))]">
                {content.titleBottom}
              </span>
            </h2>

            <div className="divider-luxe my-6 md:my-8" />

            <p className="font-editorial-italic type-lead text-[hsl(var(--cream))]/70 mb-10 md:mb-14">
              {content.lead}
            </p>

            <div className="space-y-6 md:space-y-8">
              {contactBlocks.map((block) => (
                <div key={block.label} className="flex items-start gap-5">
                  <div className="w-8 h-px bg-[hsl(var(--bronze))] mt-3 shrink-0" />
                  <div>
                    <p className="text-[0.75rem] sm:text-[0.65rem] tracking-[0.3em] uppercase text-[hsl(var(--bronze-light))] mb-2">
                      {block.label}
                    </p>
                    {block.lines.map((line) => (
                      <p
                        key={line}
                        className="text-base font-light tracking-wide text-[hsl(var(--cream))]/85"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário */}
          <div className="lg:col-span-7 min-w-0 animate-fade-in">
            {submitted ? (
              <section
                className="border border-[hsl(var(--cream))]/20 bg-[hsl(var(--cream))]/[0.04] p-6 sm:p-8 md:p-12"
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
                    [Clock3, "Confirmação", "Você recebe a confirmação pelo canal combinado."],
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
              className="border border-[hsl(var(--cream))]/15 p-6 sm:p-8 md:p-12"
            >
              <p className="label-eyebrow mb-8">Solicitação de avaliação</p>

              <ol className="grid gap-3 border-y border-[hsl(var(--cream))]/10 py-5 sm:grid-cols-3">
                <li className="flex gap-3">
                  <span className="font-display text-2xl leading-none text-[hsl(var(--bronze-light))]">01</span>
                  <span>
                    <strong className="block text-sm font-medium text-[hsl(var(--cream))]">Seus dados</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-[hsl(var(--cream))]/50">Para a equipe entrar em contato.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-display text-2xl leading-none text-[hsl(var(--bronze-light))]">02</span>
                  <span>
                    <strong className="block text-sm font-medium text-[hsl(var(--cream))]">Sua preferência</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-[hsl(var(--cream))]/50">Procedimento e horário, se desejar.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-display text-2xl leading-none text-[hsl(var(--bronze-light))]">03</span>
                  <span>
                    <strong className="block text-sm font-medium text-[hsl(var(--cream))]">Confirmação</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-[hsl(var(--cream))]/50">A reserva só é confirmada pela equipe.</span>
                  </span>
                </li>
              </ol>

              <div className="mt-8 space-y-7 md:space-y-8">
                <div>
                  <label htmlFor="appointment-name" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/70">
                    Nome completo <span className="text-[hsl(var(--bronze-light))]">*</span>
                  </label>
                  <Input
                    id="appointment-name"
                    type="text"
                    placeholder="Como prefere ser chamada"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-7 md:gap-8">
                  <div>
                    <label htmlFor="appointment-email" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/70">
                      E-mail <span className="text-[hsl(var(--bronze-light))]">*</span>
                    </label>
                    <Input
                      id="appointment-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="appointment-phone" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/70">
                      Telefone ou WhatsApp <span className="text-[hsl(var(--bronze-light))]">*</span>
                    </label>
                    <Input
                      id="appointment-phone"
                      type="tel"
                      placeholder="(67) 90000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs tracking-wide text-[hsl(var(--cream))]/70">Procedimento de interesse <span className="text-[hsl(var(--cream))]/45">(opcional)</span></p>
                  <Select
                    value={formData.procedure}
                    onValueChange={(value) => setFormData({ ...formData, procedure: value })}
                  >
                    <SelectTrigger className={fieldClass} aria-label="Procedimento de interesse">
                      <SelectValue placeholder="Quero conversar sobre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {procedures.length > 0
                        ? procedures.map((p) => (
                            <SelectItem key={p.id} value={p.title}>
                              {p.title}
                            </SelectItem>
                          ))
                        : (
                            <>
                              <SelectItem value="Gerenciamento de Envelhecimento">Gerenciamento de Envelhecimento</SelectItem>
                              <SelectItem value="Botox Full Face">Botox Full Face</SelectItem>
                              <SelectItem value="Botox para Hiper-hidrose">Botox para Hiper-hidrose</SelectItem>
                              <SelectItem value="Peptídeos e Regeneração Celular">Peptídeos e Regeneração Celular</SelectItem>
                              <SelectItem value="Harmonização Facial">Harmonização Facial</SelectItem>
                              <SelectItem value="Bioestimuladores de Colágeno">Bioestimuladores de Colágeno</SelectItem>
                              <SelectItem value="T-Sculptor e Protocolos Corporais">T-Sculptor e Protocolos Corporais</SelectItem>
                              <SelectItem value="Skinbooster e Peelings">Skinbooster e Peelings</SelectItem>
                            </>
                          )}
                    </SelectContent>
                  </Select>
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
                  <label htmlFor="appointment-message" className="mb-2 block text-xs tracking-wide text-[hsl(var(--cream))]/70">
                    Algo que a equipe deve saber <span className="text-[hsl(var(--cream))]/45">(opcional)</span>
                  </label>
                  <Textarea
                    id="appointment-message"
                    placeholder="Preferência de dia, horário ou uma dúvida"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={`${fieldClass} scrollbar-on-dark h-auto min-h-[110px] py-3 resize-none`}
                  />
                </div>

                <p className="text-xs leading-relaxed text-[hsl(var(--cream))]/50 font-light">
                  * Campos obrigatórios. Ao enviar este formulário, você concorda com
                  nossa política de privacidade.
                </p>

                <Button
                  type="submit"
                  variant="ghostLight"
                  size="lg"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Enviando..." : "Solicitar Avaliação"}
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
