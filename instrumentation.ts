export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('node:dns');
    const net = await import('node:net');
    // Force IPv4 DNS resolution order
    dns.setDefaultResultOrder('ipv4first');
    // Disable Happy Eyeballs (Node 24 tries IPv4 + IPv6 simultaneously;
    // if IPv6 is unreachable the whole connection fails with ETIMEDOUT)
    net.setDefaultAutoSelectFamily(false);
  }
}
