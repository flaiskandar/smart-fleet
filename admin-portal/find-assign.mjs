import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\LENOVO\\Downloads\\express_power\\admin-portal\\src\\pages\\Dispatch.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('amber') || line.includes('Assign') || line.includes('handleAssign')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});