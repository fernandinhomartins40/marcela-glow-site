import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Previa from "./pages/Previa";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

/* O ErrorBoundary por fora de tudo: erro de render aqui apaga a pagina que a
   possivel paciente esta vendo, e tela branca a manda embora sem nem saber que
   ha telefone para ligar. */
const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Prévia ao vivo do editor do painel — ver lib/previa.ts. */}
          <Route path="/previa" element={<Previa />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
