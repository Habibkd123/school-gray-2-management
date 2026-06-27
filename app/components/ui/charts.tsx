"use client";

import React from "react";

interface ChartData {
  label: string;
  value: number;
}

interface ChartProps {
  data: ChartData[];
  title?: string;
  color?: string;
  height?: number;
}

export function LineChart({ data, color = "#2563EB", height = 200 }: ChartProps) {
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min;

  const width = 500;
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
    return { x, y, label: d.label, val: d.value };
  });

  const pathD = points.reduce(
    (acc, curr, index) => (index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ""
  );

  const fillD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;

  return (
    <div className="w-full flex flex-col gap-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Horizontal Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          const gridVal = Math.round(max - ratio * range);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                className="stroke-slate-200"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {gridVal}%
              </text>
            </g>
          );
        })}

        {/* Area under curve */}
        <path d={fillD} fill={`${color}20`} className="transition-all duration-500 ease-in-out" />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-in-out"
        />

        {/* Data Points */}
        {points.map((p, i) => (
          <g key={i} className="group/dot cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={color}
              className="stroke-white stroke-2 transition-all duration-200 group-hover/dot:r-6"
            />
            {/* Tooltip on hover */}
            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect
                x={p.x - 30}
                y={p.y - 32}
                width="60"
                height="20"
                rx="4"
                className="fill-slate-800 shadow-md"
              />
              <text
                x={p.x}
                y={p.y - 18}
                textAnchor="middle"
                className="fill-white text-[10px] font-semibold"
              >
                {p.val}%
              </text>
            </g>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - padding / 2}
            textAnchor="middle"
            className="fill-slate-400 text-[9px] font-medium uppercase tracking-wider"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({ data, color = "#2563EB", height = 200 }: ChartProps) {
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 10);
  const padding = 45;
  const width = 500;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  const barWidth = (chartWidth / data.length) * 0.6;
  const barGap = (chartWidth / data.length) * 0.4;

  return (
    <div className="w-full flex flex-col gap-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          const gridVal = Math.round(max - ratio * max);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                className="stroke-slate-200"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {gridVal}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight;
          const x = padding + i * (barWidth + barGap) + barGap / 2;
          const y = padding + chartHeight - barHeight;

          return (
            <g key={i} className="group/bar cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 4)} // Ensure at least a line is visible
                rx="3"
                fill={color}
                className="transition-all duration-300 opacity-90 hover:opacity-100"
              />
              {/* Tooltip */}
              <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect
                  x={x + barWidth / 2 - 30}
                  y={y - 28}
                  width="60"
                  height="20"
                  rx="4"
                  className="fill-slate-800 shadow-md"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 14}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-semibold"
                >
                  {d.value}
                </text>
              </g>
              {/* Labels */}
              <text
                x={x + barWidth / 2}
                y={height - padding / 2 + 5}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-semibold uppercase tracking-wider"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface DoughnutChartProps {
  data: ChartData[];
  title?: string;
  colors?: string[]; // e.g. ["#2563EB", "#10B981", "#EF4444"]
}

export function DoughnutChart({ data, colors = ["#2563EB", "#10B981", "#1E3A5F", "#EF4444"] }: DoughnutChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const size = 180;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;
  const center = size / 2;

  let accumulatedAngle = 0;

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-around gap-6">
      {/* Circle */}
      <div className="relative w-full sm:w-[180px] h-[180px]">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-slate-100"
            strokeWidth={strokeWidth}
          />
          {data.map((d, i) => {
            const percentage = d.value / total;
            const strokeDashoffset = circumference - percentage * circumference;
            const strokeDasharray = `${circumference} ${circumference}`;
            const rotation = (accumulatedAngle / total) * 360;
            accumulatedAngle += d.value;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-95 cursor-pointer"
                style={{
                  transformOrigin: "center",
                  transform: `rotate(${rotation}deg)`
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Total
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {total}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {data.map((d, i) => {
          const percentage = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-3 text-[13px] text-slate-600 dark:text-slate-300">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200 min-w-full sm:w-[70px]">{d.label}</span>
              <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] ml-1">({percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
