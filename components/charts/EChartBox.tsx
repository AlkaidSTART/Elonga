"use client";

import { useEffect, useRef, useState } from "react";
import type { ECharts, EChartsOption } from "echarts";

interface EChartBoxProps {
  option: EChartsOption;
  className?: string;
}

export function EChartBox({ option, className = "h-72 w-full" }: EChartBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const latestOptionRef = useRef<EChartsOption>(option);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    void import("echarts").then((echarts) => {
      if (cancelled || !containerRef.current) return;

      const instance = echarts.init(containerRef.current);
      chartRef.current = instance;
      instance.setOption(latestOptionRef.current, { notMerge: true });
      setReady(true);

      observer = new ResizeObserver(() => {
        instance.resize();
      });
      observer.observe(containerRef.current);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestOptionRef.current = option;
    if (!chartRef.current) return;
    chartRef.current.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div className={`relative ${className}`}>
      {!ready && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center rounded border border-[#E2DDD3]/70 bg-[#FCFBF8]/60"
        >
          <span className="font-mono text-[11px] text-[#8C857B]">图表加载中…</span>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
