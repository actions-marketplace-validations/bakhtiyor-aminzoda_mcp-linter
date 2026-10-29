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
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'declared-empty-lists-server',
              version: '1.0.0',
            },
            instructions: 'This server advertises tools, resources, and prompts, but currently provides zero items in each list.',
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
            tools: [],
          },
        }) + '\n'
      );
    } else if (msg.method === 'resources/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            resources: [],
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
    } else if (msg.method === 'prompts/list') {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            prompts: [],
          },
        }) + '\n'
      );
    }
  } catch {
    // ignore
  }
});
