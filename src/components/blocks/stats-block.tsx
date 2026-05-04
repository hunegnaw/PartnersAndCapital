interface Stat {
  value: string;
  label: string;
}

interface StatsBlockProps {
  props: Record<string, unknown>;
}

export function StatsBlock({ props }: StatsBlockProps) {
  const heading = (props.heading as string) ?? "";
  const stats = (props.stats as Stat[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) ?? "#1A2640";

  return (
    <section className="py-20" style={{ backgroundColor }}>
      <div className="mx-auto max-w-6xl px-6">
        {heading && (
          <h2
            className="mb-12 text-center text-3xl font-bold text-white"
            style={{
              fontFamily: "var(--font-subtitle-family, inherit)",
              fontWeight: "var(--font-subtitle-weight, 600)" as unknown as number,
            }}
          >
            {heading}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-[#B07D3A]">
                {stat.value}
              </div>
              <div className="mt-2 text-white/70">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
