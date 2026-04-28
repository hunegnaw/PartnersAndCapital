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
  const backgroundColor = (props.backgroundColor as string) ?? "#0f1c2e";

  return (
    <section className="py-20" style={{ backgroundColor }}>
      <div className="mx-auto max-w-6xl px-6">
        {heading && (
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            {heading}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-[#b8860b]">
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
