import xrpl from 'xrpl';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

async function main() {
  console.log('🚀 Creating Your Own Test RLUSD\n');
  console.log('═'.repeat(60));

  const client = new xrpl.Client(XRPL_NETWORK);
  await client.connect();

  // Step 1: Hotel wallet becomes the RLUSD issuer
  const issuerWallet = xrpl.Wallet.fromSeed(process.env.HOTEL_SEED);
  console.log('\n💎 RLUSD Issuer (Hotel Wallet)');
  console.log(`   Address: ${issuerWallet.address}`);

  // Fund issuer if needed
  try {
    await client.request({
      command: 'account_info',
      account: issuerWallet.address,
      ledger_index: 'validated'
    });
  } catch (error) {
    console.log(`   🪙 Getting XRP from faucet...`);
    await client.fundWallet(issuerWallet);
    console.log(`   ✅ XRP funded!`);
  }

  // Step 2: Create trustlines from Investor and Bakery to Hotel
  const wallets = [
    { seed: process.env.INVESTOR_SEED, name: 'Investor', amount: 200000 },
    { seed: process.env.BAKERY_SEED, name: 'Bakery', amount: 200000 },
    { seed: process.env.MICHAEL_BURRY_SEED, name: 'Michael Burry', amount: 2000000 }
  ];

  console.log('\n📋 Setting Up Trustlines & Issuing RLUSD\n');

  for (const { seed, name, amount } of wallets) {
    const wallet = xrpl.Wallet.fromSeed(seed);

    console.log(`🔗 ${name} (${wallet.address})`);

    // Fund wallet if needed
    try {
      await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated'
      });
    } catch (error) {
      console.log(`   🪙 Getting XRP from faucet...`);
      await client.fundWallet(wallet);
      console.log(`   ✅ XRP funded!`);
    }

    // Check if trustline exists
    const lines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const hasTrustline = lines.result.lines.some(
      line => line.currency === RLUSD_CURRENCY && line.account === issuerWallet.address
    );

    if (!hasTrustline) {
      console.log(`   📝 Creating RLUSD trustline to issuer...`);

      const trustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          currency: RLUSD_CURRENCY,
          issuer: issuerWallet.address,
          value: '10000000'
        }
      };

      const prepared = await client.autofill(trustSet);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log(`   ✅ Trustline created!`);
      } else {
        console.log(`   ❌ Trustline failed: ${result.result.meta.TransactionResult}`);
        continue;
      }
    } else {
      console.log(`   ✅ Trustline already exists`);
    }

    // Issue RLUSD from Hotel to this wallet
    console.log(`   💰 Issuing ${amount} RLUSD...`);

    const payment = {
      TransactionType: 'Payment',
      Account: issuerWallet.address,
      Destination: wallet.address,
      Amount: {
        currency: RLUSD_CURRENCY,
        issuer: issuerWallet.address,
        value: amount.toString()
      }
    };

    const preparedPayment = await client.autofill(payment);
    const signedPayment = issuerWallet.sign(preparedPayment);
    const paymentResult = await client.submitAndWait(signedPayment.tx_blob);

    if (paymentResult.result.meta.TransactionResult === 'tesSUCCESS') {
      console.log(`   ✅ ${amount} RLUSD issued!`);
    } else {
      console.log(`   ❌ Payment failed: ${paymentResult.result.meta.TransactionResult}`);
    }

    console.log('');
  }

  await client.disconnect();

  console.log('═'.repeat(60));
  console.log('\n✅ Test RLUSD Setup Complete!\n');
  console.log('📋 Summary:');
  console.log(`   Issuer: ${issuerWallet.address} (Hotel Wallet)`);
  console.log(`   Investor: 200,000 RLUSD`);
  console.log(`   Bakery: 200,000 RLUSD\n`);
  console.log('💡 Next Steps:');
  console.log('   1. Update .env with: RLUSD_ISSUER=' + issuerWallet.address);
  console.log('   2. Run: node scripts/checkBalances.js');
  console.log('   3. Restart backend and frontend servers');
  console.log('   4. Start testing bidding!\n');
  console.log('═'.repeat(60) + '\n');
}

main();
