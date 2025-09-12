/* Conventional-commit message filter for recent commits.
 * Reads commit message from stdin and outputs a possibly rewritten message
 * based on the commit hash provided via GIT_COMMIT.
 */
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const c = (process.env.GIT_COMMIT || '').toLowerCase();
  let out = input;
  if (c.startsWith('50125bd')) {
    out = "style(ui): increase top bar height; remove 'Comprehensive' from Blockchains overview";
  } else if (c.startsWith('1afb398')) {
    out =
      'feat(config): use mock data in debug and include mock-enabled sources' +
      '\n\n- Auto-enable mock data when DEBUG_MODE or MOCK_APIS is true' +
      '\n- Include mock-enabled sources in enabled set' +
      '\n- Allow CMC/Messari/CoinGecko fetchers to load local mock files';
  } else if (c.startsWith('cc0e428')) {
    out = 'docs: add debug mode and mock data instructions';
  } else if (c.startsWith('7ed2114')) {
    out = 'style(ui): enlarge header logo and nav buttons for better tap targets';
  } else if (c.startsWith('ed813ad')) {
    out = 'style(ui): enlarge top-right nav buttons and update active/hover/focus styles';
  }
  process.stdout.write(out);
});

