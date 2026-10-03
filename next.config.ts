import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained FTP-deployable server for MonsterASP (httpPlatform → node server.js).
  output: "standalone",
  // Allow phones on the LAN (Expo WebView shell) to load dev assets.
  allowedDevOrigins: ["192.168.18.111"],
};

export default nextConfig;
