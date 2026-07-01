import satori from "satori";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const FONT_DIR = path.join(process.cwd(), "fonts");

async function loadFonts() {
  const [inter, interBold, cormorant] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "Inter-Regular.ttf")),
    fs.readFile(path.join(FONT_DIR, "Inter-Bold.ttf")),
    fs.readFile(path.join(FONT_DIR, "CormorantGaramond-Medium.ttf")),
  ]);
  return [
    { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: interBold, weight: 700 as const, style: "normal" as const },
    { name: "Cormorant", data: cormorant, weight: 500 as const, style: "normal" as const },
  ];
}

async function imageToDataUrl(imgPath: string): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "public", imgPath),
    path.join(process.cwd(), imgPath),
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      const ext = path.extname(p).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch { continue; }
  }
  return null;
}

export async function renderBannerImage(
  banner: {
    title: string;
    description: string | null;
    imageUrl: string | null;
    buttonText: string | null;
    gradientTo: string;
  },
  width: number = 532,
  height?: number
): Promise<{ png: Buffer; height: number }> {
  const minHeight = 82;
  const fonts = await loadFonts();
  const bgColor = banner.gradientTo || "#1A2640";

  // Estimate height based on content
  let contentH = 24; // padding top+bottom
  contentH += 28; // title line
  if (banner.description) contentH += 6 + Math.ceil(banner.description.length / 50) * 14;
  if (banner.buttonText) contentH += 6 + 28;
  const finalHeight = height || Math.max(minHeight, contentH);

  let imgDataUrl: string | null = null;
  if (banner.imageUrl) {
    imgDataUrl = await imageToDataUrl(banner.imageUrl);
  }

  const imgWidth = Math.round(width * 0.5);

  const element = {
    type: "div" as const,
    props: {
      style: {
        display: "flex",
        position: "relative" as const,
        width,
        height: finalHeight,
        borderRadius: 8,
        overflow: "hidden" as const,
        backgroundColor: bgColor,
      },
      children: [
        // Image on the left — cover-cropped (preserves aspect ratio, matches the
        // web preview). Previously stretched via backgroundSize:"50% 100%", which
        // elongated the image in the PDF.
        ...(imgDataUrl ? [{
          type: "img" as const,
          props: {
            src: imgDataUrl,
            style: {
              position: "absolute" as const,
              left: 0,
              top: 0,
              width: imgWidth,
              height: finalHeight,
              objectFit: "cover" as const,
              // Satori doesn't clip an absolutely-positioned child to the
              // parent's border-radius, so round the image's left corners
              // directly (it sits flush against the left edge).
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            },
          },
        }] : []),
        // Gradient overlay + text
        {
          type: "div" as const,
          props: {
            style: {
              position: "absolute" as const,
              left: 0,
              top: 0,
              display: "flex",
              width,
              height: finalHeight,
              borderRadius: 8,
              background: imgDataUrl
                ? `linear-gradient(to right, transparent 15%, ${bgColor} 45%)`
                : bgColor,
              alignItems: "center" as const,
              paddingLeft: imgDataUrl ? "38%" : "4%",
              paddingRight: "20px",
            },
            children: [
              {
                type: "div" as const,
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 6,
                  },
                  children: [
                    {
                      type: "div" as const,
                      props: {
                        style: {
                          color: "#E8D5B0",
                          fontSize: 22,
                          fontFamily: "Cormorant",
                          fontWeight: 500,
                        },
                        children: banner.title,
                      },
                    },
                    ...(banner.description ? [{
                      type: "div" as const,
                      props: {
                        style: {
                          color: "#FFFFFF",
                          fontSize: 10,
                          fontFamily: "Inter",
                        },
                        children: banner.description,
                      },
                    }] : []),
                    ...(banner.buttonText ? [{
                      type: "div" as const,
                      props: {
                        style: {
                          display: "flex",
                        },
                        children: [{
                          type: "div" as const,
                          props: {
                            style: {
                              backgroundColor: "#B07D3A",
                              color: "#FFFFFF",
                              fontSize: 10,
                              fontFamily: "Inter",
                              fontWeight: 700,
                              padding: "6px 20px",
                              borderRadius: 4,
                            },
                            children: banner.buttonText,
                          },
                        }],
                      },
                    }] : []),
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(element as Parameters<typeof satori>[0], {
    width,
    height: finalHeight,
    fonts,
  });

  const png = await sharp(Buffer.from(svg)).resize(width * 3, finalHeight * 3).png().toBuffer();
  return { png, height: finalHeight };
}
