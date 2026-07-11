import React from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center" | "right";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  const alignmentClasses = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right ml-auto",
  }[align];

  const containerClasses = align === "center" ? "max-w-3xl mx-auto" : "max-w-4xl";

  return (
    <div className={`${containerClasses} mb-12 ${alignmentClasses}`}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary mb-3">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="page-title sm: leading-tight mb-4">
        {title}
      </h2>
      {description ? (
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl dark:text-slate-300">
          {description}
        </p>
      ) : null}
    </div>
  );
}
