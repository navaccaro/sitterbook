import Image from "next/image";

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <Image
      src="/SitterBookLogo.png"
      alt="SitterBook"
      width={1184}
      height={295}
      className={`w-auto ${className}`}
    />
  );
}
