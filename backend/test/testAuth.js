import xrpl from "xrpl";
import fetch from "node-fetch";

// Test wallet (use one of your generated wallets)
const testWallet = xrpl.Wallet.fromSeed("sEdVDK1rZa1zyb81DrzwhYmUcQcWxyU"); // Bakery wallet seed

const API_URL = "http://localhost:6767";

async function testAuthentication() {
  console.log("Testing XRPL Wallet Authentication\n");
  console.log("Wallet Address:", testWallet.address);
  console.log("\n1. Requesting challenge...");

  // Step 1: Request challenge
  const challengeResponse = await fetch(`${API_URL}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: testWallet.address }),
  });

  const { challenge } = await challengeResponse.json();
  console.log("Challenge received:", challenge.substring(0, 50) + "...");

  // Step 2: Sign the challenge
  console.log("\n2. Signing challenge with wallet...");
  // Convert message to hex and sign with private key
  const messageHex = Buffer.from(challenge, 'utf8').toString('hex').toUpperCase();
  const { sign } = await import('ripple-keypairs');
  const signature = sign(messageHex, testWallet.privateKey);
  console.log("Signature:", signature);

  // Step 3: Verify signature and get token
  console.log("\n3. Verifying signature...");
  const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: testWallet.address,
      publicKey: testWallet.publicKey,
      signature: signature,
    }),
  });

  const verifyResult = await verifyResponse.json();

  if (verifyResult.success) {
    console.log("✓ Authentication successful!");
    console.log("JWT Token:", verifyResult.token.substring(0, 50) + "...");

    // Step 4: Test protected route
    console.log("\n4. Testing protected route...");
    const protectedResponse = await fetch(`${API_URL}/protected`, {
      headers: {
        Authorization: `Bearer ${verifyResult.token}`,
      },
    });

    const protectedData = await protectedResponse.json();
    console.log("Protected route response:", protectedData);
  } else {
    console.log("✗ Authentication failed:", verifyResult.error);
  }
}

testAuthentication().catch(console.error);
