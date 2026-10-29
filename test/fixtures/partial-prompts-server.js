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
              prompts: {},
            },
            serverInfo: {
              name: 'partial-prompts-server',
              version: '1.0.0',
            },
            instructions: 'Server declaring only prompts capability.',
          },
        }) + '\n'
      );
    } else if (msg.method === 'notifications/initialized') {
      // no-op
    } else if (msg.method === 'prompts/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            prompts: [
              {
                name: 'code_review',
                description: 'Prompts the model to review a code snippet for potential vulnerabilities and bugs.',
                arguments: [
                  {
                    name: 'code',
                    description: 'The source code snippet to review.',
                    required: true,
                  },
                ],
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
