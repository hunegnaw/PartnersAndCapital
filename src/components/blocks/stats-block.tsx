import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";

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
  const textColor = (props.textColor as string) || "#ffffff";
  const statValueColor = (props.statValueColor as string) || "#E8D5B0";
  const statLabelColor = (props.statLabelColor as string) || "#ffffff59";
  const maxWidth = (props.maxWidth as string) ?? "lg";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  const headingFont = resolveBlockFontVars((props.headingFont as string) || "", "h2");
  const statValueFont = resolveBlockFont((props.statValueFont as string) || "");
  const statLabelFont = resolveBlockFont((props.statLabelFont as string) || "");

  return (
    <section className="py-24" style={{ backgroundColor }}>
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-6xl"} px-16`}>
        {heading && (
          <h2
            className="heading-dark mb-14 text-center leading-[1.15]"
            style={{
              color: textColor,
              ...(headingFont ?? {}),
            }}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div
                className="leading-none"
                style={{
                  fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                  fontSize: "36px",
                  fontWeight: 300,
                  color: statValueColor,
                  ...(statValueFont ?? {}),
                }}
              >
                {stat.value}
              </div>
              <div
                className="mt-2 uppercase tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-body-family, Inter), sans-serif",
                  fontSize: "10px",
                  fontWeight: 400,
                  color: statLabelColor,
                  ...(statLabelFont ?? {}),
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
