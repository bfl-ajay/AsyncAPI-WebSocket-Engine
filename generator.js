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
    const operation = ops[0];
    if (!operation) continue;
  
    // Detect stored procedure use
    const procName = operation._json['x-sql-procedure'];
    const sqlIn = operation._json['x-sql-in'];
    const sqlOut = operation._json['x-sql-out'];
  
    // fallback to x-sql-query/x-sql-fields if not a procedure
    let sqlQuery = operation._json['x-sql-query'];
    let sqlFields = operation._json['x-sql-fields'];
  
    const msgRaw = operation._json.message;
    if (!procName && !sqlQuery && msgRaw) {
      sqlQuery = msgRaw['x-sql-query'];
      sqlFields = msgRaw['x-sql-fields'];
    }
    if (!sqlQuery && !procName) {
      sqlQuery = "INSERT INTO users (name, email) VALUES (?, ?)";
      sqlFields = ["name", "email"];
    }
  
    const payload = msgRaw?.payload;
    if (!payload) {
      console.log('  No payload, skipping...');
      continue;
    }
  
    schemaMap[channelName] = payload;
  
    // Handler generation logic
    const safeName = channelName.replace(/[\\/]/g, '_');
    const filePath = path.join(handlerDir, `${safeName}.js`);
  
    // --- Handler for stored procedure call
    if (procName) {
        // Build up the parameters as arrays
        const inParamCount = sqlIn ? sqlIn.length : 0;
        const outParamCount = sqlOut ? sqlOut.length : 0;
      
        const callArgsArr = [];
        for (let i = 0; i < inParamCount; i++) callArgsArr.push('?');
        for (let i = 0; i < outParamCount; i++) callArgsArr.push(`@out_${sqlOut[i]}`);
      
        const callArgs = callArgsArr.join(', ');
      
        fs.writeFileSync(filePath, `\
      import { pool } from '../../utils/db.js';
      export default async function(payload) {
        console.log("Handling ${channelName} (procedure)", payload);
        const conn = await pool.getConnection();
        try {
          const inParams = [${(sqlIn || []).map(f => `payload["${f}"]`).join(', ')}];
          // Prepare OUT parameter placeholders
          ${sqlOut && sqlOut.length
            ? sqlOut.map((p) => `await conn.query('SET @out_${p} = NULL');`).join('\n    ')
            : ''}
          // Build and run CALL query
          const sql = "CALL ${procName}(${callArgs})";
          await conn.query(sql, inParams);
      
          // Fetch OUT parameter values
          ${sqlOut && sqlOut.length
            ? `const [rows] = await conn.query('SELECT ${sqlOut.map(p => `@out_${p} as ${p}`).join(', ')}');`
            : ''}
          return { status: 'success', ${sqlOut && sqlOut.length ? `output: rows[0]` : ''}, payload };
        } finally {
          conn.release();
        }
      }
      `);
      }
    // --- Handler for normal SQL (unchanged)
    else if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `\
  import { pool } from '../../utils/db.js';
  export default async function(payload) {
    console.log("Handling ${channelName}", payload);
    const conn = await pool.getConnection();
    try {
      const params = [${sqlFields.map(f => `payload["${f}"]`).join(', ')}];
      await conn.query(\`${sqlQuery}\`, params);
      return { status: 'success', payload };
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
