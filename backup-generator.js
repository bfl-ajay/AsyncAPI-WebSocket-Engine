import fs from 'fs';
import path from 'path';
import { Parser } from '@asyncapi/parser';

const specPath = './asyncapi.yaml';
const generatedPath = './generated';
const handlerDir = path.join(generatedPath, 'handlers');
const schemaMap = {};

// Ensure generated folders exist
if (!fs.existsSync(generatedPath)) fs.mkdirSync(generatedPath);
if (!fs.existsSync(handlerDir)) fs.mkdirSync(handlerDir);

const parser = new Parser();
const { document, diagnostics } = await parser.parse(fs.readFileSync(specPath, 'utf8'));

// --- Debug diagnostics and document existence
console.log('Diagnostics:', diagnostics);
console.log('Document:', document ? 'exists' : 'undefined');

if (!document) {
  console.error("❌ No AsyncAPI document parsed. Please check for YAML errors.");
  process.exit(1);
}

const chans = document.channels();
console.log('Channels:', Array.isArray(chans) ? chans.length : typeof chans);

// --- Stop if validation errors exist
const blocking = diagnostics.filter(d => d.severity === 1);
if (blocking.length) {
  console.error("❌ AsyncAPI validation errors:");
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}

// --- Process channels and generate handlers
for (const channel of chans) {
  const channelName = channel.id();
  const ops = Array.from(channel.operations());
  console.log('  Operations:', ops.map(op => op.type || op.operationId?.()));

  const operation = ops[0];
  if (!operation) continue;

  // This is the fix:
  const msgRaw = operation._json.message;
  console.log('  Message:', !!msgRaw, msgRaw);

  const payload = msgRaw?.payload;
  console.log('  Payload:', !!payload, payload);

  if (!payload) {
    console.log('  No payload, skipping...');
    continue;
  }

  const schema = payload;
  console.log('  Schema:', schema);

  schemaMap[channelName] = schema;

  // Generate handler file if missing
  const safeName = channelName.replace(/[\\/]/g, '_');
  const filePath = path.join(handlerDir, `${safeName}.js`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `\
import { pool } from '../../utils/db.js';
export default async function(payload) {
  console.log("Handling ${channelName}", payload);
  const conn = await pool.getConnection();
  try {
    await conn.query('INSERT INTO users SET ?', [payload]);
    return { status: 'inserted', payload };
  } finally {
    conn.release();
  }
}
`);
  }
}

// --- Write schema map
fs.writeFileSync(
  path.join(generatedPath, 'schemaMap.json'),
  JSON.stringify(schemaMap, null, 2)
);

// --- Write dynamic router
fs.writeFileSync(
  path.join(generatedPath, 'index.js'),
  `\
import fs from 'fs';
import { validate } from '../utils/validate.js';

const schemaMap = JSON.parse(fs.readFileSync('./generated/schemaMap.json'));
const handlers = {};

for (const file of fs.readdirSync('./generated/handlers')) {
  if (file.endsWith('.js')) {
    const channel = file.replace('.js', '').replace(/_/g, '/');
    handlers[channel] = (await import('./handlers/' + file)).default;
  }
}

export async function handleMessage(channel, payload) {
  if (!handlers[channel]) throw new Error('Unknown channel: ' + channel);
  const result = validate(schemaMap[channel], payload);
  if (!result.success) throw new Error(result.error);
  return await handlers[channel](payload);
}
`);
