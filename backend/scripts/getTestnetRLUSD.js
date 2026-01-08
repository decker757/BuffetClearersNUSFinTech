import xrpl from 'xrpl';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000';

async function setupWallet(walletSeed, name) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    console.log(`\n📱 ${name}`);
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(walletSeed);
    console.log(`   Address: ${wallet.address}`);

    // Step 1: Check and get XRP if needed
    try {
      const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated'
      });

      const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000;
      console.log(`   XRP Balance: ${xrpBalance.toFixed(6)} XRP`);

      if (xrpBalance < 20) {
        console.log(`   🪙 Getting XRP from faucet...`);
        await client.fundWallet(wallet);
        console.log(`   ✅ XRP funded!`);
      }
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        console.log(`   🪙 Account not found. Getting XRP from faucet...`);
        await client.fundWallet(wallet);
        console.log(`   ✅ XRP funded!`);
      }
    }

    // Step 2: Check if RLUSD trustline exists
    const lines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const hasTrustline = lines.result.lines.some(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    if (hasTrustline) {
      console.log(`   ✅ RLUSD trustline exists`);

      // Check RLUSD balance
      const rlusdLine = lines.result.lines.find(
        line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
      );
      const balance = rlusdLine ? parseFloat(rlusdLine.balance) : 0;
      console.log(`   💰 RLUSD Balance: ${balance.toFixed(2)} RLUSD`);
    } else {
      console.log(`   📝 Creating RLUSD trustline...`);

      const trustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: RLUSD_CURRENCY,
          issuer: RLUSD_ISSUER,
          value: '10000000'
        }
      };

      const prepared = await client.autofill(trustSet);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log(`   ✅ RLUSD trustline created!`);
      } else {
        console.log(`   ❌ Failed: ${result.result.meta.TransactionResult}`);
      }
    }

    await client.disconnect();
    return wallet.address;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    await client.disconnect();
    return null;
  }
}

async function main() {
  console.log('🚀 XRPL Testnet RLUSD Setup\n');
  console.log('═'.repeat(60));

  const wallets = [
    { seed: process.env.INVESTOR_SEED, name: 'Investor Wallet' },
    { seed: process.env.BAKERY_SEED, name: 'Bakery Wallet' },
    { seed: process.env.HOTEL_SEED, name: 'Hotel Wallet (Platform)' }
  ];

  const addresses = [];

  for (const { seed, name } of wallets) {
    if (seed) {
      const address = await setupWallet(seed, name);
      if (address) addresses.push(address);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 How to Get RLUSD on Testnet:\n');
  console.log('Option 1 - XRPL Explorer Faucet:');
  console.log('   1. Go to: https://testnet.xrpl.org/');
  console.log('   2. Enter address and request tokens\n');

  console.log('Option 2 - Request from RLUSD Issuer:');
  console.log('   Contact Ripple support or community for testnet RLUSD\n');

  console.log('Option 3 - Use XRP Instead (Quick Test):');
  console.log('   Modify code to use XRP for testing instead of RLUSD\n');

  console.log('Your wallet addresses:');
  addresses.forEach((addr, i) => {
    console.log(`   ${i + 1}. ${addr}`);
  });

  console.log('\n' + '═'.repeat(60) + '\n');
}

main();
