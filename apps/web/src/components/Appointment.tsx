import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { proceduresApi, appointmentsApi, getErrorMessage } from "@/lib/api";

const Appointment = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    procedure: "",
    message: "",
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures"],
    queryFn: proceduresApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso! Entraremos em contato em breve.");
      setFormData({ name: "", email: "", phone: "", procedure: "", message: "" });
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
    });
  };

  return (
    <section id="agendamento" className="py-16 md:py-32 bg-gradient-to-br from-secondary via-accent to-primary/30 relative overflow-hidden border-t border-border/70">
      {/* Decorative pattern */}
      <div className="absolute inset-0 hidden opacity-5 md:block">
        <div className="absolute top-0 left-0 w-64 h-64 border-2 border-primary rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 border-2 border-primary rounded-full" />
      </div>

      <div className="container mx-auto px-5 sm:px-6 lg:px-10 relative z-10">
        <div className="grid md:grid-cols-5 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Left Column - Info */}
          <div className="md:col-span-2 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 tracking-wide">
              Agende Sua Avaliação
            </h2>
            <p className="text-base md:text-xl mb-8 md:mb-12 leading-relaxed">
              Entenda qual protocolo faz sentido para o seu momento
            </p>

            <div className="space-y-5 md:space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Telefone / WhatsApp</p>
                  <p className="text-foreground/80">(67) 99944-6066</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">E-mail</p>
                  <p className="text-foreground/80">contato@dramarceladuch.com.br</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Endereço</p>
                  <p className="text-foreground/80">
                    Av. 16, nº 890 - Ágatha Center<br />
                    Chapadão do Sul - MS
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Horário de Atendimento</p>
                  <p className="text-foreground/80">
                    Segunda a Sexta: 9h às 18h<br />
                    Sábado: 9h às 13h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="md:col-span-3 animate-fade-in">
            <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm p-5 sm:p-6 md:p-8 rounded-lg shadow-xl border border-border/50">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <Input
                    type="text"
                    placeholder="Nome completo *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-background/50 border-border/50"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    type="email"
                    placeholder="E-mail *"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-background/50 border-border/50"
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="Telefone / WhatsApp *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-background/50 border-border/50"
                    required
                  />
                </div>

                <Select
                  value={formData.procedure}
                  onValueChange={(value) => setFormData({ ...formData, procedure: value })}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Procedimento de interesse" />
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

                <Textarea
                  placeholder="Mensagem (opcional)"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-background/50 border-border/50 min-h-[120px]"
                />

                <p className="text-sm text-muted-foreground">
                  * Campos obrigatórios. Ao enviar este formulário, você concorda com nossa política de privacidade.
                </p>

                <Button
                  type="submit"
                  variant="cta"
                  size="lg"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Enviando..." : "Solicitar Avaliação"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Appointment;
