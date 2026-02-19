'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LogoOverlay() {
  return (
    <Link
      href="/"
      className="fixed top-1 left-0 z-[9999] flex items-center gap-1.5 px-4 h-12 md:gap-1.5 md:px-4"
    >
      <Image
        src="/awaves_letter.svg"
        alt="AWAVES"
        width={60}
        height={20}
        className="h-4 md:h-5 w-auto mt-1 hidden md:block"
      />
      <Image
        src="/awaves_logo.svg"
        alt="AWAVES Logo"
        width={36}
        height={36}
        className="h-7 md:h-9 w-auto"
      />
    </Link>
  );
}
