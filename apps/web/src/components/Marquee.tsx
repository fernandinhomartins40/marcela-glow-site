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
    <div className="bg-espresso py-4 md:py-6 overflow-x-clip border-y border-[hsl(var(--cream))]/10">
      <div className="flex w-max animate-marquee whitespace-nowrap" aria-hidden="true">
        {[...messages, ...messages].map((message, index) => (
          <div key={index} className="flex items-center shrink-0 mx-5 md:mx-8">
            <span className="font-display italic text-lg md:text-2xl text-[hsl(var(--cream))]/85 font-light tracking-wide">
              {message}
            </span>
            <span className="ml-5 text-sm text-[hsl(var(--bronze))] md:ml-8 md:text-base">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
