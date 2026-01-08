import xrpl from "xrpl";

export const bakeryWallet = xrpl.Wallet.fromSeed(process.env.BAKERY_SEED);
export const investorWallet = xrpl.Wallet.fromSeed(process.env.INVESTOR_SEED);
export const hotelWallet = xrpl.Wallet.fromSeed(process.env.HOTEL_SEED);
export const platformWallet = xrpl.Wallet.fromSeed(process.env.PLATFORM_WALLET_SEED);

