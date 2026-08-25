import fetch from 'node:http';

const post = (path, body) => new Promise((resolve, reject) => {
  const data = JSON.stringify(body);
  const req = fetch.request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve(JSON.parse(body)));
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

async function main() {
  // Login
  const login = await post('/v1/auth/login', { username: 'admin', password: 'password123' });
  const token = login.token;

  // Create a quick job via the API
  const result = await post('/v1/jobs', {
    client_id: 'c0000001-0000-0000-0000-000000000001',
    site_id: 'cs000001-0000-0000-0000-000000000001',
    site_address: 'Jalan Pelabuhan Utara, Port Klang',
    job_type: 'emergency',
    sla_minutes: 120,
    notes: 'Test quick create',
  });

  console.log('Job created:', JSON.stringify(result, null, 2));
}

main().catch(console.error);