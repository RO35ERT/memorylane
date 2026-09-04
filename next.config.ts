import type { NextConfig } from "next";
import dns from "node:dns";
import net from "node:net";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const nextConfig: NextConfig = {};

export default nextConfig;
