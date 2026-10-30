// Fixture: answers initialize with a JSON-RPC error, like a server started without its API key
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return;
  const msg = JSON.parse(line);
  if (msg.method === 'initialize') {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32001, message: 'Not authenticated - your API key is missing' },
      }) + '\n'
    );
  }
});
