import 'dotenv/config';
import xrpl from 'xrpl';

const RLUSD_ISSUER = process.env.RLUSD_ISSUER || 'r9EMUwedCZFW53NVfw9SNHvKoRWJ8fbgu7';
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex
const PLATFORM_WALLET_SEED = process.env.PLATFORM_WALLET_SEED;

async function setupPlatformTrustline() {
  if (!PLATFORM_WALLET_SEED) {
    console.error('❌ PLATFORM_WALLET_SEED not found in .env');
    process.exit(1);
  }

  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');

  try {
    await client.connect();
    console.log('🔗 Connected to XRPL Testnet');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(PLATFORM_WALLET_SEED);
    console.log('👛 Platform wallet address:', wallet.address);

    // Check if trustline already exists
    const lines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const existingTrustline = lines.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    if (existingTrustline) {
      console.log('✅ RLUSD trustline already exists');
      console.log('   Balance:', existingTrustline.balance, 'RLUSD');
      console.log('   Limit:', existingTrustline.limit, 'RLUSD');
      await client.disconnect();
      return;
    }

    console.log('📝 Creating RLUSD trustline...');
    console.log('   Issuer:', RLUSD_ISSUER);
    console.log('   Currency:', 'RLUSD');
    console.log('   Limit: 10,000,000 RLUSD');

    // Create trustline transaction
    const trustSetTx = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: RLUSD_CURRENCY,
        issuer: RLUSD_ISSUER,
        value: '10000000' // 10 million RLUSD limit
      }
    };

    // Submit and wait for validation
    const result = await client.submitAndWait(trustSetTx, { wallet });

    console.log('✅ Trustline created successfully!');
    console.log('   Transaction hash:', result.result.hash);
    console.log('   Result:', result.result.meta.TransactionResult);

    // Verify trustline was created
    const verifyLines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const newTrustline = verifyLines.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    if (newTrustline) {
      console.log('✅ Verification successful - trustline is active');
      console.log('   Platform wallet can now receive RLUSD payments');
    }

    await client.disconnect();
    console.log('\n🎉 Platform wallet is ready to receive RLUSD!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.disconnect();
    process.exit(1);
  }
}

setupPlatformTrustline();
