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

async function transferRLUSD(fromSeed, toAddress, amount) {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    console.log('🔗 Connecting to XRPL Testnet...');
    await client.connect();

    const fromWallet = xrpl.Wallet.fromSeed(fromSeed);
    console.log(`\n💼 From: ${fromWallet.address}`);
    console.log(`📬 To: ${toAddress}`);
    console.log(`💰 Amount: ${amount} RLUSD\n`);

    // Check sender's RLUSD balance
    const linesResult = await client.request({
      command: 'account_lines',
      account: fromWallet.address,
      ledger_index: 'validated'
    });

    const rlusdLine = linesResult.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    const currentBalance = rlusdLine ? parseFloat(rlusdLine.balance) : 0;
    console.log(`📊 Current Balance: ${currentBalance} RLUSD`);

    if (currentBalance < amount) {
      throw new Error(`Insufficient RLUSD! Have ${currentBalance}, need ${amount}`);
    }

    // Send RLUSD payment
    console.log('\n💸 Sending RLUSD...');

    const payment = {
      TransactionType: 'Payment',
      Account: fromWallet.address,
      Destination: toAddress,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    const prepared = await client.autofill(payment);
    const signed = fromWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log('✅ Transfer successful!');
      console.log(`🔗 Transaction: ${signed.hash}`);
    } else {
      throw new Error(`Transfer failed: ${result.result.meta.TransactionResult}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n✅ Disconnected from XRPL');
  }
}

// Usage: node transferRLUSD.js <from_seed> <to_address> <amount>
const fromSeed = process.argv[2];
const toAddress = process.argv[3];
const amount = parseFloat(process.argv[4]);

if (!fromSeed || !toAddress || !amount) {
  console.error('❌ Usage: node transferRLUSD.js <from_seed> <to_address> <amount>');
  console.error('Example: node transferRLUSD.js sEdV... rN7n7otQDd6FczFgLdlqtyMVrn3eQqRvLh 50000');
  process.exit(1);
}

console.log('🚀 XRPL RLUSD Transfer Tool\n');
transferRLUSD(fromSeed, toAddress, amount);
