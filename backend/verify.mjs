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

const get = (path, token) => new Promise((resolve, reject) => {
  const req = fetch.request(`http://localhost:3000${path}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve(JSON.parse(body)));
  });
  req.on('error', reject);
  req.end();
});

async function main() {
  const login = await post('/v1/auth/login', { username: 'admin', password: 'password123' });
  const token = login.token;
  const vehicles = await get('/v1/vehicles', token);
  const generators = await get('/v1/generators', token);
  const jobs = await get('/v1/jobs', token);
  console.log('Vehicles:', vehicles.vehicles?.length || 0);
  console.log('Generators:', generators.generators?.length || 0);
  console.log('Jobs:', jobs.jobs?.length || 0);
}
main().catch(console.error);