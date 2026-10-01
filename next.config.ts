import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones on the LAN (Expo WebView shell) to load dev assets.
  allowedDevOrigins: ["192.168.18.111"],
};

export default nextConfig;
