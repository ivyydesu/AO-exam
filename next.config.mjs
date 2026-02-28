/** @type {import("next").NextConfig} */
const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
const cameraPolicy = dailyDomain
  ? `camera=(self "https://${dailyDomain}"), microphone=(self "https://${dailyDomain}"), geolocation=()`
  : 'camera=(self), microphone=(self), geolocation=()';

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: cameraPolicy },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://*.daily.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.daily.co wss://*.daily.co; frame-src 'self' https://*.daily.co https://js.stripe.com; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';"
          }
        ]
      }
      ,
      {
        source: "/(.*)",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
      }
    ];
  }
};

export default nextConfig;
