import { Sparkles } from "lucide-react";

const Marquee = () => {
  const messages = [
    "Hidratação que vem de dentro",
    "Saúde, beleza e tecnologia",
    "Rejuvenescimento natural",
    "Medicina regenerativa",
    "Autoestima e bem-estar",
    "Resultados cientificamente comprovados",
  ];

  return (
    <div className="bg-gradient-luxury py-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-shimmer opacity-30" />
      <div className="flex animate-marquee whitespace-nowrap relative z-10">
        {/* Duplicate content for seamless loop */}
        {[...messages, ...messages].map((message, index) => (
          <div key={index} className="flex items-center mx-10">
            <span className="text-primary-foreground font-semibold text-lg tracking-luxury drop-shadow-lg">
              {message}
            </span>
            <Sparkles className="w-5 h-5 text-gold-premium ml-10 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
