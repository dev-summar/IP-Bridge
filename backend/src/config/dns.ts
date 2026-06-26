import dns from 'dns';

const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1,8.8.4.4')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

dns.setServers(servers);

console.log(`[DNS] Public resolvers configured: ${servers.join(', ')}`);
