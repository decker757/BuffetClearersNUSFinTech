import xrpl from 'xrpl';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'; // Official Ripple RLUSD testnet issuer
// RLUSD as hex-encoded currency code
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

async function fundWalletWithRLUSD(walletSeed, amount = 200000) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    console.log('🔗 Connecting to XRPL Testnet...');
    await client.connect();

    const wallet = xrpl.Wallet.fromSeed(walletSeed);
    console.log(`\n💼 Wallet Address: ${wallet.address}`);

    // Step 1: Check XRP balance (need XRP for transaction fees)
    console.log('\n📊 Checking XRP balance...');
    const accountInfo = await client.request({
      command: 'account_info',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000;
    console.log(`XRP Balance: ${xrpBalance} XRP`);

    if (xrpBalance < 20) {
      console.log('\n⚠️  Low XRP balance! Getting free XRP from faucet...');
      const faucetResult = await client.fundWallet(wallet);
      console.log(`✅ Faucet funded: ${faucetResult.balance} drops`);
    }

    // Step 2: Create RLUSD trustline (if not exists)
    console.log('\n🔗 Setting up RLUSD trustline...');

    try {
      const trustlineCheck = await client.request({
        command: 'account_lines',
        account: wallet.address,
        ledger_index: 'validated'
      });

      const hasRLUSDTrustline = trustlineCheck.result.lines.some(
        line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
      );

      if (!hasRLUSDTrustline) {
        console.log('Creating RLUSD trustline...');

        const trustSet = {
          TransactionType: 'TrustSet',
          Account: wallet.address,
          LimitAmount: {
            currency: RLUSD_CURRENCY,
            issuer: RLUSD_ISSUER,
            value: '1000000' // 1M RLUSD limit
          }
        };

        const prepared = await client.autofill(trustSet);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
          console.log('✅ RLUSD trustline created!');
        } else {
          throw new Error(`Trustline failed: ${result.result.meta.TransactionResult}`);
        }
      } else {
        console.log('✅ RLUSD trustline already exists');
      }
    } catch (error) {
      console.log('Note: Trustline setup error (may already exist):', error.message);
    }

    // Step 3: Request RLUSD from issuer (this is testnet-specific)
    console.log(`\n💰 Requesting ${amount} RLUSD from issuer...`);
    console.log('\n⚠️  NOTE: For testnet RLUSD, you need to:');
    console.log('1. Go to: https://test.bithomp.com/faucet/rlusd');
    console.log('2. Enter your wallet address:', wallet.address);
    console.log('3. Request RLUSD tokens\n');
    console.log('OR use the XRPL Testnet Faucet at:');
    console.log('https://xrpl.org/xrp-testnet-faucet.html');

    // Check current RLUSD balance
    const linesResult = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const rlusdLine = linesResult.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    const currentRLUSD = rlusdLine ? parseFloat(rlusdLine.balance) : 0;
    console.log(`\n📊 Current RLUSD Balance: ${currentRLUSD} RLUSD`);

    if (currentRLUSD < amount) {
      console.log(`⚠️  Need ${amount - currentRLUSD} more RLUSD for testing`);
    } else {
      console.log('✅ Sufficient RLUSD for testing!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('\n✅ Disconnected from XRPL');
  }
}

// Get wallet seed from command line or use investor seed
const walletSeed = process.argv[2] || process.env.INVESTOR_SEED;
const amount = parseInt(process.argv[3]) || 200000;

if (!walletSeed) {
  console.error('❌ Usage: node fundTestnetRLUSD.js <wallet_seed> [amount]');
  console.error('Example: node fundTestnetRLUSD.js sEdV... 200000');
  process.exit(1);
}

console.log('🚀 XRPL Testnet RLUSD Funding Tool\n');
fundWalletWithRLUSD(walletSeed, amount);
