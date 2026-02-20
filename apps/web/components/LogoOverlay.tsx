'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LogoOverlay() {
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 flex-shrink-0 py-1"
    >
      {/* Letter logo hidden on mobile to save space, shown on desktop */}
      <Image
        src="/awaves_letter.svg"
        alt="awaves"
        width={60}
        height={20}
        className="hidden md:block h-5 w-auto mt-1"
      />
      <Image
        src="/awaves_logo.svg"
        alt="awaves Logo"
        width={36}
        height={36}
        className="h-8 w-auto md:h-9"
      />
    </Link>
  );
}
