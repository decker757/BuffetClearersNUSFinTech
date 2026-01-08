import xrpl from 'xrpl';

const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');

async function checkAccount() {
  try {
    await client.connect();
    
    const platformAddress = 'rJoESWx9ZKHpEyNrLWBTA95XLxwoKJj59u';
    
    try {
      const response = await client.request({
        command: 'account_info',
        account: platformAddress,
        ledger_index: 'validated'
      });
      
      console.log('✅ Platform account EXISTS');
      console.log('Balance:', xrpl.dropsToXrp(response.result.account_data.Balance), 'XRP');
    } catch (err) {
      if (err.data && err.data.error === 'actNotFound') {
        console.log('❌ Platform account DOES NOT EXIST');
        console.log('Fund it at: https://xrpl.org/xrp-testnet-faucet.html');
      } else {
        throw err;
      }
    }
    
    await client.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccount();
