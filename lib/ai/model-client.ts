export type TextApiFormat = "openai-chat" | "openai-responses" | "anthropic";

export interface TextApiFormatMeta {
  id: TextApiFormat;
  label: string;
  shortLabel: string;
  defaultPath: string;
  description: string;
}

export const TEXT_API_FORMATS: TextApiFormatMeta[] = [
  {
    id: "openai-chat",
    label: "OpenAI Chat",
    shortLabel: "Chat",
    defaultPath: "/chat/completions",
    description: "兼容 OpenAI / DeepSeek / 通义 / Ollama 等 /chat/completions 协议",
  },
  {
    id: "openai-responses",
    label: "OpenAI Responses",
    shortLabel: "Responses",
    defaultPath: "/responses",
    description: "兼容 OpenAI 新版 /responses 请求与返回格式",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    shortLabel: "Anthropic",
    defaultPath: "/v1/messages",
    description: "兼容 Claude / Anthropic 原生 Messages 协议（x-api-key）",
  },
];

export const DEFAULT_IMAGE_ENDPOINT_PATH = "/images/edits";

export function isTextApiFormat(value: unknown): value is TextApiFormat {
  return value === "openai-chat" || value === "openai-responses" || value === "anthropic";
}

export function getTextApiFormatMeta(format?: TextApiFormat): TextApiFormatMeta {
  return TEXT_API_FORMATS.find((item) => item.id === format) ?? TEXT_API_FORMATS[0];
}

export function normalizePort(port?: string): string {
  const trimmed = (port ?? "").trim().replace(/^:/, "");
  if (!trimmed) return "";
  if (!/^\d{1,5}$/.test(trimmed)) {
    throw new Error("自定义端口号无效，请填写 1-65535 之间的数字");
  }
  const num = Number(trimmed);
  if (num < 1 || num > 65535) {
    throw new Error("自定义端口号超出范围，请填写 1-65535 之间的数字");
  }
  return String(num);
}

const KNOWN_ENDPOINT_SUFFIXES = [
  "/chat/completions",
  "/responses",
  "/messages",
  "/images/edits",
  "/images/generations",
];

function joinEndpointPath(basePathname: string, targetPath: string): string {
  const cleanBase = basePathname.replace(/\/+$/, "");
  const cleanTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

  if (cleanBase && cleanBase.endsWith(cleanTarget)) {
    return cleanBase;
  }

  // Avoid duplicating /v1 when baseUrl ends with /v1 and target starts with /v1/
  if (cleanBase.endsWith("/v1") && cleanTarget.startsWith("/v1/")) {
    return `${cleanBase}${cleanTarget.slice(3)}`;
  }

  return `${cleanBase}${cleanTarget}`;
}

export interface ResolveEndpointOptions {
  baseUrl: string;
  port?: string;
  endpointPath?: string;
  defaultPath: string;
}

export function resolveModelEndpointUrl(options: ResolveEndpointOptions): string {
  const rawBase = options.baseUrl.trim();
  if (!rawBase) {
    throw new Error("请填写 Base URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawBase);
  } catch {
    throw new Error("Base URL 格式不正确，请以 http:// 或 https:// 开头");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Base URL 仅支持 http:// 或 https:// 协议");
  }

  const normalizedPort = normalizePort(options.port);
  if (normalizedPort) {
    parsed.port = normalizedPort;
  }

  const customPath = (options.endpointPath ?? "").trim();
  const cleanBasePath = parsed.pathname.replace(/\/+$/, "");

  if (customPath) {
    parsed.pathname = joinEndpointPath(cleanBasePath, customPath);
  } else {
    const alreadyHasKnownSuffix = KNOWN_ENDPOINT_SUFFIXES.some((suffix) =>
      cleanBasePath.endsWith(suffix),
    );
    parsed.pathname = alreadyHasKnownSuffix
      ? cleanBasePath
      : joinEndpointPath(cleanBasePath, options.defaultPath);
  }

  return parsed.toString();
}

export function previewModelEndpointUrl(options: ResolveEndpointOptions): {
  url: string | null;
  error?: string;
} {
  try {
    return { url: resolveModelEndpointUrl(options) };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "接口地址无效",
    };
  }
}

export function resolveBaseUrlWithPort(baseUrl: string, port?: string): string {
  const rawBase = baseUrl.trim();
  if (!rawBase) {
    throw new Error("请填写 Base URL");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawBase);
  } catch {
    throw new Error("Base URL 格式不正确，请以 http:// 或 https:// 开头");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Base URL 仅支持 http:// 或 https:// 协议");
  }
  const normalizedPort = normalizePort(port);
  if (normalizedPort) {
    parsed.port = normalizedPort;
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
}

function parseDataUrlImage(dataUrl: string): { mediaType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64Data: match[2] };
}

export interface TextModelCallOptions {
  apiKey: string;
  baseUrl: string;
  port?: string;
  endpointPath?: string;
  apiFormat?: TextApiFormat;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  imageBase64?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface BuiltTextModelRequest {
  url: string;
  format: TextApiFormat;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export function buildTextModelRequest(options: TextModelCallOptions): BuiltTextModelRequest {
  const format: TextApiFormat = isTextApiFormat(options.apiFormat)
    ? options.apiFormat
    : "openai-chat";
  const formatMeta = getTextApiFormatMeta(format);
  const url = resolveModelEndpointUrl({
    baseUrl: options.baseUrl,
    port: options.port,
    endpointPath: options.endpointPath,
    defaultPath: formatMeta.defaultPath,
  });

  const apiKey = options.apiKey.trim();
  const model = options.model.trim();
  const systemPrompt = options.systemPrompt?.trim();

  if (format === "anthropic") {
    const contentBlocks: Array<Record<string, unknown>> = [];
    if (options.imageBase64) {
      const parsedImg = parseDataUrlImage(options.imageBase64);
      if (parsedImg) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: parsedImg.mediaType,
            data: parsedImg.base64Data,
          },
        });
      }
    }
    contentBlocks.push({ type: "text", text: options.userPrompt });

    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 4096,
      messages: [
        {
          role: "user",
          content: options.imageBase64 ? contentBlocks : options.userPrompt,
        },
      ],
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    return {
      url,
      format,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    };
  }

  if (format === "openai-responses") {
    const body: Record<string, unknown> = {
      model,
      input: options.imageBase64
        ? [
            {
              role: "user",
              content: [
                { type: "input_text", text: options.userPrompt },
                { type: "input_image", image_url: options.imageBase64 },
              ],
            },
          ]
        : options.userPrompt,
    };
    if (systemPrompt) {
      body.instructions = systemPrompt;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_output_tokens = options.maxTokens;
    }

    return {
      url,
      format,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    };
  }

  // Default: openai-chat
  const messages: Array<Record<string, unknown>> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  if (options.imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: options.userPrompt },
        { type: "image_url", image_url: { url: options.imageBase64 } },
      ],
    });
  } else {
    messages.push({ role: "user", content: options.userPrompt });
  }

  const body: Record<string, unknown> = {
    model,
    messages,
  };
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }

  return {
    url,
    format,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  };
}

export function extractTextFromModelResponse(format: TextApiFormat, data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;

  if (format === "anthropic") {
    const content = record.content;
    if (Array.isArray(content)) {
      const textParts = content
        .filter(
          (block): block is { type?: string; text?: string } =>
            Boolean(block) && typeof block === "object",
        )
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text as string);
      if (textParts.length > 0) {
        return textParts.join("");
      }
    }
    if (typeof record.completion === "string") {
      return record.completion;
    }
  }

  if (format === "openai-responses") {
    if (typeof record.output_text === "string" && record.output_text) {
      return record.output_text;
    }
    const output = record.output;
    if (Array.isArray(output)) {
      const parts: string[] = [];
      for (const item of output) {
        if (!item || typeof item !== "object") continue;
        const itemContent = (item as Record<string, unknown>).content;
        if (Array.isArray(itemContent)) {
          for (const block of itemContent) {
            if (!block || typeof block !== "object") continue;
            const b = block as Record<string, unknown>;
            if (
              (b.type === "output_text" || b.type === "text") &&
              typeof b.text === "string"
            ) {
              parts.push(b.text);
            }
          }
        }
      }
      if (parts.length > 0) {
        return parts.join("");
      }
    }
  }

  // OpenAI Chat Completions (also fallback if a proxy wraps responses in choices)
  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter(
          (part): part is { text?: string } =>
            Boolean(part) && typeof part === "object" && typeof (part as { text?: unknown }).text === "string",
        )
        .map((part) => part.text as string)
        .join("");
    }
  }

  return "";
}

export interface TextModelCallResult {
  text: string;
  endpointUrl: string;
  format: TextApiFormat;
  status: number;
  latencyMs: number;
  raw: unknown;
}

export async function callTextModel(options: TextModelCallOptions): Promise<TextModelCallResult> {
  const built = buildTextModelRequest(options);
  const fetchFn = options.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchFn(built.url, {
      method: "POST",
      headers: built.headers,
      body: JSON.stringify(built.body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `大模型接口调用失败 (${response.status}): ${errText.slice(0, 240) || response.statusText}`,
      );
    }

    const raw = await response.json();
    const text = extractTextFromModelResponse(built.format, raw);

    return {
      text,
      endpointUrl: built.url,
      format: built.format,
      status: response.status,
      latencyMs,
      raw,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`大模型接口请求超时（>${Math.round(timeoutMs / 1000)}秒）`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
