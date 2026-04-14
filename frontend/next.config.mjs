/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Determine the backend URL based on the environment
    const isProd = process.env.NODE_ENV === "production";
    const backendUrl = isProd 
      ? "https://diary-backend-qxhmc5knkq-nw.a.run.app" 
      : "http://localhost:8000";
    
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
