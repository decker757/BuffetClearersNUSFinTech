import xrpl from 'xrpl';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const XRPL_NETWORK = process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = process.env.RLUSD_ISSUER || 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
// RLUSD as hex-encoded currency code
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

if (!RLUSD_ISSUER) {
  console.error('❌ RLUSD_ISSUER not set in .env file!');
  process.exit(1);
}

console.log(`Using RLUSD Issuer: ${RLUSD_ISSUER}`);

async function checkBalance(walletSeed, name) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();

    const wallet = xrpl.Wallet.fromSeed(walletSeed);

    // Get XRP balance
    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000;

    // Get RLUSD balance
    const linesResult = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const rlusdLine = linesResult.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    const rlusdBalance = rlusdLine ? parseFloat(rlusdLine.balance) : 0;

    console.log(`\n📱 ${name}`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   XRP: ${xrpBalance.toFixed(6)} XRP`);
    console.log(`   RLUSD: ${rlusdBalance.toFixed(2)} RLUSD`);

    await client.disconnect();

    return { xrp: xrpBalance, rlusd: rlusdBalance };

  } catch (error) {
    console.log(`\n📱 ${name}`);
    console.log(`   ❌ Error: ${error.message}`);
    await client.disconnect();
    return null;
  }
}

async function checkAllBalances() {
  console.log('🚀 Checking XRPL Testnet Balances\n');
  console.log('═'.repeat(60));

  const wallets = [
    { seed: process.env.INVESTOR_SEED, name: 'Investor Wallet' },
    { seed: process.env.BAKERY_SEED, name: 'Bakery Wallet' },
    { seed: process.env.HOTEL_SEED, name: 'Hotel Wallet (Platform)' },
    { seed: process.env.MICHAEL_BURRY_SEED, name: 'Michael Burry' },
  ];

  for (const { seed, name } of wallets) {
    if (seed) {
      await checkBalance(seed, name);
    } else {
      console.log(`\n📱 ${name}: ❌ Seed not found in .env`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n💡 To get RLUSD:');
  console.log('   1. Visit: https://test.bithomp.com/faucet/rlusd');
  console.log('   2. Enter wallet address');
  console.log('   3. Request RLUSD tokens\n');
}

checkAllBalances();
