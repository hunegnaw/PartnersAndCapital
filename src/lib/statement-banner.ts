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
  height: number = 82
): Promise<Buffer> {
  const fonts = await loadFonts();
  const bgColor = banner.gradientTo || "#1A2640";

  let imgDataUrl: string | null = null;
  if (banner.imageUrl) {
    imgDataUrl = await imageToDataUrl(banner.imageUrl);
  }

  const element = {
    type: "div" as const,
    props: {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        borderRadius: 6,
        overflow: "hidden",
        position: "relative" as const,
      },
      children: [
        // Background image (left side)
        ...(imgDataUrl ? [{
          type: "img" as const,
          props: {
            src: imgDataUrl,
            style: {
              position: "absolute" as const,
              left: 0,
              top: 0,
              width: "50%",
              height: "100%",
              objectFit: "cover" as const,
            },
          },
        }] : []),
        // Gradient overlay
        {
          type: "div" as const,
          props: {
            style: {
              position: "absolute" as const,
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              background: imgDataUrl
                ? `linear-gradient(to right, transparent 15%, ${bgColor} 45%)`
                : bgColor,
            },
          },
        },
        // Text content
        {
          type: "div" as const,
          props: {
            style: {
              position: "absolute" as const,
              left: imgDataUrl ? "38%" : "4%",
              top: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column" as const,
              justifyContent: "center" as const,
              padding: "12px 20px",
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
                    marginBottom: 4,
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
                    marginBottom: 6,
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
  };

  const scale = 3;
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: width * scale,
    height: height * scale,
    fonts,
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}
