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
    <div className="bg-primary py-6 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {/* Duplicate content for seamless loop */}
        {[...messages, ...messages].map((message, index) => (
          <div key={index} className="flex items-center mx-8">
            <span className="text-primary-foreground font-medium text-lg tracking-wider">
              {message}
            </span>
            <Sparkles className="w-4 h-4 text-primary-foreground ml-8" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
