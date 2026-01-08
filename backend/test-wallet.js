import xrpl from 'xrpl';
import dotenv from 'dotenv';

dotenv.config();

async function checkWalletBalance() {
  try {
    const client = new xrpl.Client(process.env.XRPL_NETWORK);
    await client.connect();
    console.log('Connected to XRPL Testnet');

    const wallet = xrpl.Wallet.fromSeed(process.env.BAKERY_SEED);
    console.log('\nPlatform Wallet Address:', wallet.address);

    const balance = await client.getXrpBalance(wallet.address);
    console.log('XRP Balance:', balance);

    if (parseFloat(balance) < 10) {
      console.log('\n⚠️  WARNING: Low balance! NFT minting requires XRP for fees.');
      console.log('Fund this wallet at: https://faucet.altnet.rippletest.net/');
    } else {
      console.log('\n✅ Wallet has sufficient balance');
    }

    await client.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWalletBalance();
