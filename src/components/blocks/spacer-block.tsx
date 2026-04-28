interface SpacerBlockProps {
  props: Record<string, unknown>;
}

const SIZE_MAP: Record<string, string> = {
  sm: "h-8",
  md: "h-16",
  lg: "h-24",
  xl: "h-32",
};

export function SpacerBlock({ props }: SpacerBlockProps) {
  const size = (props.size as string) ?? "md";
  const heightClass = SIZE_MAP[size] ?? "h-16";

  return <div className={heightClass} aria-hidden="true" />;
}
