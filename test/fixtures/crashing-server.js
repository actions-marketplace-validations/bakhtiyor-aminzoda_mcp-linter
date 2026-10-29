// Fixture: Immediately crashes on startup
process.stderr.write('Fatal server panic: crash on startup\n');
process.exit(1);
