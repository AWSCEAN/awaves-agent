'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LogoOverlay() {
  return (
    <Link
      href="/"
      style={{
        position: 'fixed',
        top: '4px',
        left: 0,
        zIndex: 41,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 16px',
        height: '48px',
      }}
    >
      <Image
        src="/awaves_letter.svg"
        alt="AWAVES"
        width={60}
        height={20}
        style={{ height: '20px', width: 'auto', marginTop: '4px' }}
      />
      <Image
        src="/awaves_logo.svg"
        alt="AWAVES Logo"
        width={36}
        height={36}
        style={{ height: '36px', width: 'auto' }}
      />
    </Link>
  );
}
