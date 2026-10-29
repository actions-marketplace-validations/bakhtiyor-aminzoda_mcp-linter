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
              name: 'partial-tools-server',
              version: '1.0.0',
            },
            instructions: 'Server declaring only tools capability.',
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
          result: {
            tools: [
              {
                name: 'calculate_sum',
                title: 'Calculate Sum',
                description: 'Calculates the arithmetic sum of two given numbers.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    a: { type: 'number', description: 'The first addend number.' },
                    b: { type: 'number', description: 'The second addend number.' },
                  },
                  required: ['a', 'b'],
                },
                annotations: {
                  readOnlyHint: true,
                },
              },
            ],
          },
        }) + '\n'
      );
    }
  } catch {
    // ignore
  }
});
