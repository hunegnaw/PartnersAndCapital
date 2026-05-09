"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";

interface FaqSection {
  id: string;
  title: string;
  items: { question: string; answer: string }[];
}

interface FaqBlockProps {
  props: Record<string, unknown>;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function FaqBlock({ props }: FaqBlockProps) {
  const heading = (props.heading as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";
  const headingColor = (props.headingColor as string) || "";
  const questionColor = (props.questionColor as string) || "#1A2640";
  const answerColor = (props.answerColor as string) || "#888780";
  const sectionTitleColor = (props.sectionTitleColor as string) || "#1A2640";
  const maxWidth = (props.maxWidth as string) ?? "xl";
  const showSidebar = props.showSidebar !== false;
  const sidebarTitle = (props.sidebarTitle as string) || "Jump to section";

  const MAX_WIDTH: Record<string, string> = {
    sm: "max-w-4xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  const headingFont = resolveBlockFontVars(
    (props.headingFont as string) || "",
    "h2"
  );
  const sectionTitleFont = resolveBlockFontVars(
    (props.sectionTitleFont as string) || "",
    "h3"
  );
  const questionFont = resolveBlockFont(
    (props.questionFont as string) || ""
  );
  const answerFont = resolveBlockFont((props.answerFont as string) || "");

  // Build sections from props, with backward compat for legacy `items`
  const rawSections = (props.sections as FaqSection[]) ?? [];
  const legacyItems =
    (props.items as { question: string; answer: string }[]) ?? [];

  const sections: FaqSection[] =
    rawSections.length > 0
      ? rawSections
      : legacyItems.length > 0
        ? [{ id: "legacy", title: "", items: legacyItems }]
        : [];

  const hasSections = sections.length > 1 || (sections.length === 1 && sections[0].title);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(
    sections[0]?.id ?? ""
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const toggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  const setSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    },
    []
  );

  // IntersectionObserver for sidebar scroll tracking
  useEffect(() => {
    if (!showSidebar || !hasSections) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    const refs = sectionRefs.current;
    for (const id of Object.keys(refs)) {
      const el = refs[id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [showSidebar, hasSections, sections.length]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="py-24 md:py-28" style={{ backgroundColor }}>
      <div
        className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-7xl"} px-16`}
      >
        {/* Header */}
        {heading && (
          <div className="mb-14">
            <h2
              className="heading-light leading-[1.15]"
              style={{
                color: headingColor || undefined,
                ...(headingFont ?? {}),
              }}
              dangerouslySetInnerHTML={{ __html: heading }}
            />
          </div>
        )}

        {/* Two-column layout: sidebar + content */}
        <div
          className="flex gap-0"
          style={{
            display: showSidebar && hasSections ? "grid" : "block",
            gridTemplateColumns:
              showSidebar && hasSections ? "240px 1fr" : undefined,
          }}
        >
          {/* Sidebar */}
          {showSidebar && hasSections && (
            <nav
              className="hidden lg:block"
              style={{
                position: "sticky",
                top: "88px",
                alignSelf: "start",
                paddingRight: "24px",
              }}
            >
              <p
                className="mb-4 text-xs font-medium uppercase tracking-[0.15em]"
                style={{ color: "#888780" }}
              >
                {sidebarTitle}
              </p>
              <div>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`faq-sidebar-link${activeSection === section.id ? " active" : ""}`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* Content */}
          <div
            style={{
              borderLeft:
                showSidebar && hasSections
                  ? "1px solid rgba(26,38,64,0.1)"
                  : undefined,
              paddingLeft:
                showSidebar && hasSections ? "48px" : undefined,
            }}
          >
            {sections.map((section, si) => (
              <div
                key={section.id}
                id={section.id}
                ref={setSectionRef(section.id)}
                className={si > 0 ? "mt-16" : ""}
                style={{ scrollMarginTop: "96px" }}
              >
                {/* Section header */}
                {section.title && (
                  <div
                    className="mb-8 pb-4"
                    style={{
                      borderBottom: "1px solid rgba(26,38,64,0.1)",
                    }}
                  >
                    <h3
                      className="heading-light flex items-baseline gap-4"
                      style={{
                        color: sectionTitleColor,
                        ...(sectionTitleFont ?? {}),
                      }}
                    >
                      <span
                        className="shrink-0"
                        style={{
                          fontFamily:
                            "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          letterSpacing: "0.05em",
                          color: "#B07D3A",
                        }}
                      >
                        {ROMAN[si] ?? si + 1}
                      </span>
                      <span>{section.title}</span>
                    </h3>
                  </div>
                )}

                {/* FAQ Items */}
                {section.items.map((item, qi) => {
                  const key = `${section.id}-${qi}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      style={{
                        borderBottom: "0.5px solid rgba(26,38,64,0.1)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between py-6 text-left"
                      >
                        <span
                          style={{
                            fontFamily:
                              "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                            fontSize: "16px",
                            fontWeight: 400,
                            lineHeight: 1.4,
                            color: questionColor,
                            ...(questionFont ?? {}),
                          }}
                        >
                          {item.question}
                        </span>
                        <span
                          className="ml-4 shrink-0 select-none transition-transform duration-300"
                          style={{
                            color: "#B07D3A",
                            fontSize: "20px",
                            fontWeight: 300,
                            lineHeight: 1,
                            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                          }}
                        >
                          +
                        </span>
                      </button>
                      <div
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          maxHeight: isOpen ? "2000px" : "0px",
                          opacity: isOpen ? 1 : 0,
                        }}
                      >
                        <div className="pb-6 faq-answer">
                          <div
                            className="leading-[1.7]"
                            style={{
                              fontFamily:
                                "var(--font-body-family, Inter), sans-serif",
                              fontSize: "12px",
                              fontWeight: 300,
                              color: answerColor,
                              ...(answerFont ?? {}),
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.answer,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
