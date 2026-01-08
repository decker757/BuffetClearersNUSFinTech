import xrpl from 'xrpl';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'; // Official Ripple RLUSD testnet issuer
// RLUSD as hex-encoded currency code (non-standard 3-char codes must be hex)
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

async function setupTrustline(walletSeed, name) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(walletSeed);

    console.log(`\n🔗 Setting up ${name}`);
    console.log(`   Address: ${wallet.address}`);

    // Check if trustline exists
    const lines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const hasTrustline = lines.result.lines.some(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    if (hasTrustline) {
      console.log(`   ✅ RLUSD trustline already exists`);
      await client.disconnect();
      return wallet.address;
    }

    // Create trustline
    console.log(`   📝 Creating RLUSD trustline...`);
    const trustSet = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: RLUSD_CURRENCY,
        issuer: RLUSD_ISSUER,
        value: '10000000' // 10M RLUSD limit
      }
    };

    const prepared = await client.autofill(trustSet);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log(`   ✅ Trustline created!`);
    } else {
      console.log(`   ❌ Failed: ${result.result.meta.TransactionResult}`);
    }

    await client.disconnect();
    return wallet.address;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    await client.disconnect();
    return null;
  }
}

async function distributeRLUSD(fromSeed, toAddresses, amountEach) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();
    const fromWallet = xrpl.Wallet.fromSeed(fromSeed);

    console.log(`\n💰 Distributing RLUSD from ${fromWallet.address}`);

    for (const toAddress of toAddresses) {
      console.log(`\n   📤 Sending ${amountEach} RLUSD to ${toAddress.substring(0, 20)}...`);

      const payment = {
        TransactionType: 'Payment',
        Account: fromWallet.address,
        Destination: toAddress,
        Amount: {
          currency: RLUSD_CURRENCY,
          value: amountEach.toString(),
          issuer: RLUSD_ISSUER
        }
      };

      const prepared = await client.autofill(payment);
      const signed = fromWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log(`   ✅ Sent successfully!`);
      } else {
        console.log(`   ❌ Failed: ${result.result.meta.TransactionResult}`);
      }
    }

    await client.disconnect();

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    await client.disconnect();
  }
}

async function main() {
  console.log('🚀 XRPL RLUSD Setup & Distribution\n');
  console.log('═'.repeat(60));

  const wallets = [
    { seed: process.env.INVESTOR_SEED, name: 'Investor' },
    { seed: process.env.BAKERY_SEED, name: 'Bakery' },
    { seed: process.env.HOTEL_SEED, name: 'Hotel (Platform)' }
  ];

  // Step 1: Setup trustlines for all wallets
  console.log('\n📋 STEP 1: Setting up RLUSD trustlines for all wallets');
  const addresses = [];

  for (const { seed, name } of wallets) {
    if (seed) {
      const address = await setupTrustline(seed, name);
      if (address) addresses.push({ address, name, seed });
    }
  }

  // Step 2: Instructions to get RLUSD
  console.log('\n\n═'.repeat(60));

  if (addresses.length === 0) {
    console.log('\n❌ No wallets were set up successfully. Please check the errors above.\n');
    return;
  }

  console.log('\n📋 STEP 2: Get RLUSD from faucet');
  console.log('\n   1. Visit: https://test.bithomp.com/faucet/rlusd');
  console.log(`   2. Enter: ${addresses[0].address}`);
  console.log('   3. Request 200,000 RLUSD tokens');
  console.log('\n   Then run this script with "distribute" to send to other wallets:');
  console.log('   node scripts/setupAndDistributeRLUSD.js distribute\n');

  // Step 3: Distribute if requested
  if (process.argv[2] === 'distribute') {
    console.log('\n═'.repeat(60));
    console.log('\n📋 STEP 3: Distributing RLUSD');

    // Distribute from investor to others (50k each)
    const fromWallet = wallets[0]; // Investor
    const toAddresses = addresses.slice(1).map(w => w.address); // Bakery & Hotel

    await distributeRLUSD(fromWallet.seed, toAddresses, 50000);

    console.log('\n✅ Distribution complete!');
    console.log('\nRun this to check balances:');
    console.log('node scripts/checkBalances.js\n');
  }

  console.log('═'.repeat(60) + '\n');
}

main();
