export function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight text-[#1a2d2a] ${className}`}>
      Sitter<span className="text-[#e86e52]">Book</span>
    </span>
  );
}
