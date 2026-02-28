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
          { key: "Permissions-Policy", value: cameraPolicy }
        ]
      }
    ];
  }
};

export default nextConfig;
