interface PageHeroProps {
  title: string;
  imageUrl?: string | null;
}

export function PageHero({ title, imageUrl }: PageHeroProps) {
  const titleStyle = {
    fontFamily: "var(--font-hero-title-family, inherit)",
    fontWeight: "var(--font-hero-title-weight, 700)" as unknown as number,
    fontStyle: "var(--font-hero-title-style, normal)",
    color: "var(--font-hero-title-color, #ffffff)",
    fontSize: "var(--font-hero-title-size, inherit)",
  };

  if (imageUrl) {
    return (
      <div
        className="relative h-[600px] bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center px-6 tracking-tight"
            style={titleStyle}
          >
            {title}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-[#1A2640] flex items-center justify-center">
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center px-6 tracking-tight"
        style={titleStyle}
      >
        {title}
      </h1>
    </div>
  );
}
