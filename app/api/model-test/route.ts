import { NextResponse } from "next/server";
import {
  callTextModel,
  DEFAULT_IMAGE_ENDPOINT_PATH,
  getTextApiFormatMeta,
  isTextApiFormat,
  resolveBaseUrlWithPort,
  resolveModelEndpointUrl,
  type TextApiFormat,
} from "@/lib/ai/model-client";

interface ModelTestRequest {
  target: "text" | "image";
  apiKey?: string;
  baseUrl?: string;
  port?: string;
  endpointPath?: string;
  apiFormat?: TextApiFormat;
  model?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ModelTestRequest;
    const target = body.target === "image" ? "image" : "text";
    const apiKey = body.apiKey?.trim() ?? "";
    const baseUrl = body.baseUrl?.trim() ?? "";
    const port = body.port?.trim() ?? "";
    const endpointPath = body.endpointPath?.trim() ?? "";
    const model = body.model?.trim() ?? "";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "请先填写 API Key 再测试连通性" },
        { status: 400 },
      );
    }

    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: "请先填写 Base URL 再测试连通性" },
        { status: 400 },
      );
    }

    if (!model) {
      return NextResponse.json(
        { ok: false, error: "请先填写模型名称再测试连通性" },
        { status: 400 },
      );
    }

    if (target === "text") {
      const apiFormat: TextApiFormat = isTextApiFormat(body.apiFormat)
        ? body.apiFormat
        : "openai-chat";
      const formatMeta = getTextApiFormatMeta(apiFormat);
      const endpointUrl = resolveModelEndpointUrl({
        baseUrl,
        port,
        endpointPath,
        defaultPath: formatMeta.defaultPath,
      });

      const startedAt = Date.now();
      try {
        const result = await callTextModel({
          apiKey,
          baseUrl,
          port,
          endpointPath,
          apiFormat,
          model,
          userPrompt: "Reply with OK",
          temperature: 0,
          maxTokens: 16,
          timeoutMs: 15000,
        });

        return NextResponse.json({
          ok: true,
          target,
          format: result.format,
          endpointUrl: result.endpointUrl,
          latencyMs: result.latencyMs,
          message: `连通成功（${formatMeta.label}）`,
          replyPreview: result.text.trim().slice(0, 60),
        });
      } catch (err) {
        const latencyMs = Date.now() - startedAt;
        const message = err instanceof Error ? err.message : "连接测试失败";
        return NextResponse.json(
          {
            ok: false,
            target,
            format: apiFormat,
            endpointUrl,
            latencyMs,
            error: message,
          },
          { status: 200 },
        );
      }
    }

    // Image model connectivity test (avoid spending generation credits)
    const endpointUrl = resolveModelEndpointUrl({
      baseUrl,
      port,
      endpointPath,
      defaultPath: DEFAULT_IMAGE_ENDPOINT_PATH,
    });
    const baseWithPort = resolveBaseUrlWithPort(baseUrl, port);
    const modelsUrl = `${baseWithPort}/models`;

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const modelsRes = await fetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startedAt;

      if (modelsRes.ok) {
        return NextResponse.json({
          ok: true,
          target,
          endpointUrl,
          latencyMs,
          message: "生图服务鉴权与连通性正常",
        });
      }

      if (modelsRes.status === 401 || modelsRes.status === 403) {
        const errText = await modelsRes.text().catch(() => "");
        return NextResponse.json({
          ok: false,
          target,
          endpointUrl,
          latencyMs,
          error: `鉴权失败 (${modelsRes.status}): ${errText.slice(0, 180) || "API Key 无效或无权限"}`,
        });
      }

      // Some image proxies do not expose /models; probe the resolved image endpoint directly
      const probeRes = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model }),
        signal: controller.signal,
      });

      const totalLatencyMs = Date.now() - startedAt;

      if (probeRes.status === 401 || probeRes.status === 403) {
        const errText = await probeRes.text().catch(() => "");
        return NextResponse.json({
          ok: false,
          target,
          endpointUrl,
          latencyMs: totalLatencyMs,
          error: `鉴权失败 (${probeRes.status}): ${errText.slice(0, 180) || "API Key 无效或无权限"}`,
        });
      }

      if (probeRes.ok || probeRes.status === 400 || probeRes.status === 422) {
        return NextResponse.json({
          ok: true,
          target,
          endpointUrl,
          latencyMs: totalLatencyMs,
          message: "生图端点已连通（服务端鉴权通过）",
        });
      }

      const errText = await probeRes.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        target,
        endpointUrl,
        latencyMs: totalLatencyMs,
        error: `端点响应异常 (${probeRes.status}): ${errText.slice(0, 180) || probeRes.statusText}`,
      });
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "连接超时（>12秒），请检查地址与端口"
          : err instanceof Error
            ? err.message
            : "网络请求失败";
      return NextResponse.json({
        ok: false,
        target,
        endpointUrl,
        latencyMs,
        error: message,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "测试请求参数异常";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
