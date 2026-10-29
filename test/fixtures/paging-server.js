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
            capabilities: { tools: {} },
            serverInfo: { name: 'paging-server', version: '1.0.0' },
            instructions: 'Paging server fixture',
          },
        }) + '\n'
      );
    } else if (msg.method === 'notifications/initialized') {
      // no-op
    } else if (msg.method === 'tools/list') {
      const cursor = msg.params?.cursor;
      if (!cursor) {
        // First page
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              tools: [
                {
                  name: 'tool_page_1',
                  title: 'Tool Page 1',
                  description: 'First page tool',
                  inputSchema: { type: 'object', properties: {} },
                },
              ],
              nextCursor: 'page_2',
            },
          }) + '\n'
        );
      } else {
        // Second page
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              tools: [
                {
                  name: 'tool_page_2',
                  title: 'Tool Page 2',
                  description: 'Second page tool',
                  inputSchema: { type: 'object', properties: {} },
                },
              ],
            },
          }) + '\n'
        );
      }
    }
  } catch {
    // ignore
  }
});
