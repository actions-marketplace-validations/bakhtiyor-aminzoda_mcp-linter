import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const tools = [];
for (let i = 1; i <= 50; i++) {
  tools.push({
    name: `tool_operation_${i}`,
    title: `Operation ${i}`,
    description: `Performs standard operations and diagnostics for item ${i}.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: `Unique identifier for operation ${i}` },
        flag: { type: 'boolean', description: 'Enable debug mode' },
      },
      required: ['id'],
    },
    annotations: {
      readOnlyHint: true,
    },
  });
}

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'large-server', version: '1.0.0' },
            instructions: 'Server with 50 tools.',
          },
        }) + '\n'
      );
    } else if (msg.method === 'notifications/initialized') {
      // no-op
    } else if (msg.method === 'tools/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { tools },
        }) + '\n'
      );
    }
  } catch {
    // ignore
  }
});
