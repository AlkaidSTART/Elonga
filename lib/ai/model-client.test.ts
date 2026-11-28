import { describe, expect, it, vi } from "vitest";
import {
  buildTextModelRequest,
  callTextModel,
  extractTextFromModelResponse,
  normalizePort,
  resolveModelEndpointUrl,
} from "./model-client";

describe("normalizePort", () => {
  it("accepts valid numeric ports with or without leading colon", () => {
    expect(normalizePort("")).toBe("");
    expect(normalizePort("11434")).toBe("11434");
    expect(normalizePort(":8080")).toBe("8080");
  });

  it("rejects non-numeric or out-of-range ports", () => {
    expect(() => normalizePort("abc")).toThrow("自定义端口号无效");
    expect(() => normalizePort("0")).toThrow("自定义端口号超出范围");
    expect(() => normalizePort("70000")).toThrow("自定义端口号超出范围");
  });
});

describe("resolveModelEndpointUrl", () => {
  it("appends default path for OpenAI Chat and Responses", () => {
    expect(
      resolveModelEndpointUrl({
        baseUrl: "https://api.deepseek.com/v1",
        defaultPath: "/chat/completions",
      }),
    ).toBe("https://api.deepseek.com/v1/chat/completions");

    expect(
      resolveModelEndpointUrl({
        baseUrl: "https://api.openai.com/v1",
        defaultPath: "/responses",
      }),
    ).toBe("https://api.openai.com/v1/responses");
  });

  it("avoids duplicating /v1 for Anthropic default path", () => {
    expect(
      resolveModelEndpointUrl({
        baseUrl: "https://api.anthropic.com",
        defaultPath: "/v1/messages",
      }),
    ).toBe("https://api.anthropic.com/v1/messages");

    expect(
      resolveModelEndpointUrl({
        baseUrl: "https://api.anthropic.com/v1",
        defaultPath: "/v1/messages",
      }),
    ).toBe("https://api.anthropic.com/v1/messages");
  });

  it("applies custom port and custom endpoint path", () => {
    expect(
      resolveModelEndpointUrl({
        baseUrl: "http://127.0.0.1/v1",
        port: "11434",
        endpointPath: "/custom/chat",
        defaultPath: "/chat/completions",
      }),
    ).toBe("http://127.0.0.1:11434/v1/custom/chat");
  });

  it("does not duplicate suffix when baseUrl already includes endpoint path", () => {
    expect(
      resolveModelEndpointUrl({
        baseUrl: "https://proxy.example.com/v1/chat/completions",
        defaultPath: "/chat/completions",
      }),
    ).toBe("https://proxy.example.com/v1/chat/completions");
  });
});

describe("buildTextModelRequest", () => {
  it("builds OpenAI Chat Completions payload", () => {
    const req = buildTextModelRequest({
      apiKey: "sk-test",
      baseUrl: "https://api.deepseek.com/v1",
      apiFormat: "openai-chat",
      model: "deepseek-chat",
      systemPrompt: "sys",
      userPrompt: "hello",
      temperature: 0.5,
    });

    expect(req.url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(req.headers.Authorization).toBe("Bearer sk-test");
    expect(req.body).toEqual({
      model: "deepseek-chat",
      temperature: 0.5,
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hello" },
      ],
    });
  });

  it("builds OpenAI Responses payload", () => {
    const req = buildTextModelRequest({
      apiKey: "sk-resp",
      baseUrl: "https://api.openai.com/v1",
      apiFormat: "openai-responses",
      model: "gpt-4.1-mini",
      systemPrompt: "be concise",
      userPrompt: "ping",
      maxTokens: 32,
    });

    expect(req.url).toBe("https://api.openai.com/v1/responses");
    expect(req.headers.Authorization).toBe("Bearer sk-resp");
    expect(req.body).toEqual({
      model: "gpt-4.1-mini",
      instructions: "be concise",
      input: "ping",
      max_output_tokens: 32,
    });
  });

  it("builds Anthropic Messages payload", () => {
    const req = buildTextModelRequest({
      apiKey: "sk-ant-123",
      baseUrl: "https://api.anthropic.com",
      port: "8443",
      apiFormat: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemPrompt: "system note",
      userPrompt: "hi claude",
      maxTokens: 128,
    });

    expect(req.url).toBe("https://api.anthropic.com:8443/v1/messages");
    expect(req.headers["x-api-key"]).toBe("sk-ant-123");
    expect(req.headers["anthropic-version"]).toBe("2023-06-01");
    expect(req.body).toEqual({
      model: "claude-sonnet-4-20250514",
      max_tokens: 128,
      system: "system note",
      messages: [{ role: "user", content: "hi claude" }],
    });
  });
});

describe("extractTextFromModelResponse", () => {
  it("extracts text from OpenAI Chat format", () => {
    expect(
      extractTextFromModelResponse("openai-chat", {
        choices: [{ message: { content: "hello chat" } }],
      }),
    ).toBe("hello chat");
  });

  it("extracts text from OpenAI Responses format", () => {
    expect(
      extractTextFromModelResponse("openai-responses", {
        output_text: "direct output",
      }),
    ).toBe("direct output");

    expect(
      extractTextFromModelResponse("openai-responses", {
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "nested response" }],
          },
        ],
      }),
    ).toBe("nested response");
  });

  it("extracts text from Anthropic Messages format", () => {
    expect(
      extractTextFromModelResponse("anthropic", {
        content: [
          { type: "text", text: "hello " },
          { type: "text", text: "anthropic" },
        ],
      }),
    ).toBe("hello anthropic");
  });
});

describe("callTextModel", () => {
  it("calls fetch with built request and parses response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "OK" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await callTextModel({
      apiKey: "sk-ant-test",
      baseUrl: "https://api.anthropic.com",
      apiFormat: "anthropic",
      model: "claude-sonnet-4-20250514",
      userPrompt: "Reply with OK",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result.text).toBe("OK");
    expect(result.format).toBe("anthropic");
    expect(result.endpointUrl).toBe("https://api.anthropic.com/v1/messages");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws descriptive error when upstream returns non-OK status", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(
      callTextModel({
        apiKey: "bad-key",
        baseUrl: "https://api.openai.com/v1",
        apiFormat: "openai-responses",
        model: "gpt-4.1-mini",
        userPrompt: "ping",
        fetchImpl: mockFetch as unknown as typeof fetch,
      }),
    ).rejects.toThrow("大模型接口调用失败 (401)");
  });
});
