import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 24, className = "" }: BrandLogoProps) {
  return (
    <Image
      src="/elonga-logo.png"
      alt="Elonga"
      width={size}
      height={size}
      priority
      className={`shrink-0 object-contain select-none ${className}`}
    />
  );
}
