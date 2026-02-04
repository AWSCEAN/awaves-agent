interface AwavesLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function AwavesLogo({ size = 'md' }: AwavesLogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`font-bold ${sizeClasses[size]} text-ocean-700`}>
      <span className="text-ocean-500">A</span>
      <span>WAVES</span>
      <span className="animate-wave inline-block ml-1">🌊</span>
    </div>
  );
}
