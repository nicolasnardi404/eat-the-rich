import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST
  }
};


export default nextConfig;
