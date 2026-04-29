const Marquee = () => {
  const messages = [
    "Medicina Estética",
    "Medicina Regenerativa",
    "Harmonização Facial",
    "Neck Contour Signature",
    "Bioestimuladores",
    "T-Sculptor",
    "Skinbooster",
    "Antienvelhecimento",
  ];

  return (
    <div className="bg-espresso py-8 overflow-hidden border-y border-[hsl(var(--cream))]/10">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...messages, ...messages, ...messages].map((message, index) => (
          <div key={index} className="flex items-center mx-10">
            <span className="font-display italic text-2xl md:text-3xl text-[hsl(var(--cream))]/90 font-light tracking-wide">
              {message}
            </span>
            <span className="ml-10 text-[hsl(var(--bronze))] text-xl">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
