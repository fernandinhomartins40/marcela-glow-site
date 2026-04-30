const Marquee = () => {
  const messages = [
    "Medicina Estética",
    "Gerenciamento de Envelhecimento",
    "Botox Full Face",
    "Peptídeos",
    "Regeneração Celular",
    "Qualidade de Pele",
    "Harmonização Facial",
    "Bioestimuladores",
    "T-Sculptor",
    "Skinbooster",
    "Hiper-hidrose",
  ];

  return (
    <div className="bg-espresso py-4 md:py-8 overflow-hidden border-y border-[hsl(var(--cream))]/10">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...messages, ...messages, ...messages].map((message, index) => (
          <div key={index} className="flex items-center mx-5 md:mx-10">
            <span className="font-display italic text-xl md:text-3xl text-[hsl(var(--cream))]/90 font-light tracking-wide">
              {message}
            </span>
            <span className="ml-5 text-base text-[hsl(var(--bronze))] md:ml-10 md:text-xl">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
