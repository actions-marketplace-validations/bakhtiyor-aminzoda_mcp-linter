import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

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
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'list-error-server',
              version: '1.0.0',
            },
            instructions: 'Server where tools/list fails with RPC error.',
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
          error: {
            code: -32603,
            message: 'Internal server error during tools enumeration',
          },
        }) + '\n'
      );
    }
  } catch {
    // ignore
  }
});
