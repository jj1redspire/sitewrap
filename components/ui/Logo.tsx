"use client";

interface LogoProps {
  inverted?: boolean;
}

export function Logo({ inverted = false }: LogoProps) {
  return (
    <span className="text-2xl font-extrabold tracking-tight select-none">
      <span className={inverted ? "text-white" : "text-[#1C1917]"}>Site</span>
      <span className="text-[#EA580C]">Wrap</span>
    </span>
  );
}
