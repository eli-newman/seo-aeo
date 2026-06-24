/**
 * Image generation provider seam. The real Gemini implementation lives
 * below; `NullImageProvider` is used when images are disabled so the
 * pipeline can call the same interface unconditionally.
 */
export interface GeneratedImage {
  /** Raw image bytes. */
  bytes: Buffer;
  /** File extension without the dot, e.g. "png". */
  ext: string;
}

export interface ImageProvider {
  readonly enabled: boolean;
  /** Generate a single image from a text prompt. */
  generate(prompt: string): Promise<GeneratedImage>;
}

/** No-op provider used when image generation is disabled. */
export class NullImageProvider implements ImageProvider {
  readonly enabled = false;
  async generate(): Promise<GeneratedImage> {
    throw new Error("Image generation is disabled for this project.");
  }
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Google Gemini image generation. Reads GEMINI_API_KEY by default. */
export class GeminiProvider implements ImageProvider {
  readonly enabled = true;
  private model: string;
  private apiKey: string;
  // Lazily imported to keep the dep out of the hot path when images are off.
  private clientPromise?: Promise<{
    models: {
      generateContent(req: unknown): Promise<unknown>;
    };
  }>;

  constructor(
    model = "gemini-2.0-flash-exp-image-generation",
    apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  ) {
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set, but image generation is enabled. " +
          "Set the secret or disable images in seo-aeo.config.json.",
      );
    }
    this.model = model;
    this.apiKey = apiKey;
  }

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import("@google/genai").then(
        ({ GoogleGenAI }) =>
          new GoogleGenAI({ apiKey: this.apiKey }) as unknown as {
            models: { generateContent(req: unknown): Promise<unknown> };
          },
      );
    }
    return this.clientPromise;
  }

  async generate(prompt: string): Promise<GeneratedImage> {
    const ai = await this.client();
    const resp = (await ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseModalities: ["Text", "Image"] },
    })) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
        };
      }>;
    };

    const parts = resp.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (data) {
        const mime = part.inlineData?.mimeType ?? "image/png";
        return { bytes: Buffer.from(data, "base64"), ext: MIME_EXT[mime] ?? "png" };
      }
    }
    throw new Error("Gemini returned no image data for the prompt.");
  }
}
