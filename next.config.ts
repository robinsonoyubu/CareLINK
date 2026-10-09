import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v8: single hubs — My Bookings, My Chats, Profile. Old duplicate routes redirect.
  async redirects() {
    return [
      { source: "/messages", destination: "/chats", permanent: true },
      { source: "/settings", destination: "/profile", permanent: true },
      { source: "/clients/bookings", destination: "/bookings", permanent: true },
      { source: "/clients/cases", destination: "/bookings", permanent: true },
      { source: "/provider/bookings/:id", destination: "/bookings/:id", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;

