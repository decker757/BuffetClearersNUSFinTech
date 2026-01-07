import xrpl from "xrpl";

async function generateWallets() {
  console.log("Generating test wallets on XRPL Testnet...\n");

  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();

  // Generate and fund wallets
  const bakeryWallet = (await client.fundWallet()).wallet;
  console.log("Bakery Wallet:");
  console.log("  Address:", bakeryWallet.address);
  console.log("  Seed:", bakeryWallet.seed);
  console.log("  Balance: 1000 XRP (testnet)\n");

  const investorWallet = (await client.fundWallet()).wallet;
  console.log("Investor Wallet:");
  console.log("  Address:", investorWallet.address);
  console.log("  Seed:", investorWallet.seed);
  console.log("  Balance: 1000 XRP (testnet)\n");

  const hotelWallet = (await client.fundWallet()).wallet;
  console.log("Hotel Wallet:");
  console.log("  Address:", hotelWallet.address);
  console.log("  Seed:", hotelWallet.seed);
  console.log("  Balance: 1000 XRP (testnet)\n");

  console.log("Copy these seeds to your .env file:");
  console.log(`BAKERY_SEED=${bakeryWallet.seed}`);
  console.log(`INVESTOR_SEED=${investorWallet.seed}`);
  console.log(`HOTEL_SEED=${hotelWallet.seed}`);

  await client.disconnect();
}

generateWallets().catch(console.error);
