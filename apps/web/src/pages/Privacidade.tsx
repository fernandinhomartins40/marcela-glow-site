import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Theme from "@/components/Theme";
import PoliticaDePrivacidade from "@/components/PoliticaDePrivacidade";

/**
 * `/privacidade` — o endereço que vai no Google Play e na App Store.
 *
 * Não respeita "esconder seção" do painel: as lojas tiram o app do ar se a
 * política sumir, e a LGPD exige que ela esteja acessível.
 */
export default function Privacidade() {
  useEffect(() => {
    const anterior = document.title;
    document.title = "Política de Privacidade — Dra. Marcela Duch";
    return () => {
      document.title = anterior;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Theme />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center px-4 sm:px-6">
          <a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao site
          </a>
        </div>
      </header>
      <PoliticaDePrivacidade />
    </div>
  );
}
