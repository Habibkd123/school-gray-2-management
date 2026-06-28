import React from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}

export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  const alignment = align === "left" ? "text-left" : "text-center";
  const container = align === "left" ? "items-start" : "items-center";

  return (
    <div className={`flex flex-col ${container} mb-14 ${alignment}`}>
      {eyebrow && (
        <span className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight max-w-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[15px] text-slate-600 leading-relaxed max-w-3xl">
          {description}
        </p>
      )}
    </div>
  );
}
