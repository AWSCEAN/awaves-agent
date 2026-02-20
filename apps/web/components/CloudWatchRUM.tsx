'use client';

import Script from 'next/script';

const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_RUM_IDENTITY_POOL_ID;
const RUM_ENDPOINT = process.env.NEXT_PUBLIC_RUM_ENDPOINT || 'https://dataplane.rum.us-east-1.amazonaws.com';

export default function CloudWatchRUM() {
  if (!IDENTITY_POOL_ID) return null;

  return (
    <>
      <Script
        src="https://client.rum.us-east-1.amazonaws.com/1.18.0/cwr.js"
        strategy="afterInteractive"
      />
      <Script id="cwr-init" strategy="afterInteractive">
        {`
          if (typeof cwr !== 'undefined') {
            cwr('init', {
              identityPoolId: '${IDENTITY_POOL_ID}',
              endpoint: '${RUM_ENDPOINT}',
              telemetries: ['performance', 'errors', 'http'],
              allowCookies: true,
              enableXRay: true
            });
          }
        `}
      </Script>
    </>
  );
}
