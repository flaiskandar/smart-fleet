import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\LENOVO\\Downloads\\express_power\\admin-portal\\src\\pages\\Dispatch.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  const trimmed = line.trim();
  if (trimmed.includes('handleCreate') || trimmed.includes('setShowCreate') || trimmed.includes('setAssign') || trimmed.includes('fetchBindings') || trimmed.includes('onClick={() => {')) {
    console.log(`${i+1}: ${trimmed.substring(0, 120)}`);
  }
});