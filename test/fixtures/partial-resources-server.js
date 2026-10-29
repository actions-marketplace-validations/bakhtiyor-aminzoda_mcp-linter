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
              resources: {},
            },
            serverInfo: {
              name: 'partial-resources-server',
              version: '1.0.0',
            },
            instructions: 'Server declaring only resources capability.',
          },
        }) + '\n'
      );
    } else if (msg.method === 'notifications/initialized') {
      // no-op
    } else if (msg.method === 'resources/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            resources: [
              {
                uri: 'file:///path/to/resource.json',
                name: 'App Config',
                description: 'Application configuration in JSON format.',
                mimeType: 'application/json',
              },
            ],
          },
        }) + '\n'
      );
    } else if (msg.method === 'resources/templates/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            resourceTemplates: [],
          },
        }) + '\n'
      );
    }
  } catch {
    // ignore
  }
});
