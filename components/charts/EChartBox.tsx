"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface EChartBoxProps {
  option: EChartsOption;
  className?: string;
}

export function EChartBox({ option, className = "h-72 w-full" }: EChartBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = echarts.init(el);
    chartRef.current = instance;

    const observer = new ResizeObserver(() => {
      instance.resize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      instance.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} className={className} />;
}
