import Image from 'next/image';

interface AwavesLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function AwavesLogo({ size = 'md' }: AwavesLogoProps) {
  const sizeMap = {
    sm: { width: 80, height: 32 },
    md: { width: 120, height: 48 },
    lg: { width: 180, height: 72 },
  };

  const { width, height } = sizeMap[size];

  return (
    <Image
      src="/awaves_main.svg"
      alt="awaves Logo"
      width={width}
      height={height}
      priority
    />
  );
}
