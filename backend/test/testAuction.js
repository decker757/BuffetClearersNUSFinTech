import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:6767';

// Test helper function
async function testEndpoint(name, method, url, body = null, token = null) {
  console.log(`\n📋 Testing: ${name}`);
  console.log(`   ${method} ${url}`);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
      return { success: false, data };
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Auction API Tests\n');
  console.log('=' .repeat(60));

  // Test 1: Get active auctions (no auth required)
  await testEndpoint(
    'Get Active Auctions',
    'GET',
    `${BASE_URL}/auctions`
  );

  // Test 2: Get specific auction (should fail if no auctions exist)
  await testEndpoint(
    'Get Auction by ID',
    'GET',
    `${BASE_URL}/auctions/1`
  );

  // Test 3: Try to create auction without auth (should fail)
  await testEndpoint(
    'Create Auction (No Auth - Should Fail)',
    'POST',
    `${BASE_URL}/auctions`,
    {
      nftoken_id: 'test_nft_001',
      face_value: 10000,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      min_bid: 9000
    }
  );

  // Test 4: Try to place bid without auth (should fail)
  await testEndpoint(
    'Place Bid (No Auth - Should Fail)',
    'POST',
    `${BASE_URL}/auctions/1/bids`,
    {
      bid_amount: 9500
    }
  );

  // Test 5: Get bids for an auction
  await testEndpoint(
    'Get Auction Bids',
    'GET',
    `${BASE_URL}/auctions/1/bids`
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ All basic tests completed!');
  console.log('\nNote: To test authenticated endpoints, you need:');
  console.log('  1. Get a JWT token from /auth/challenge and /auth/verify');
  console.log('  2. Pass it in the Authorization header');
}

runTests();