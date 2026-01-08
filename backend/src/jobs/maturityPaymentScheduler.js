import {
  processMaturedNFTs,
  markOverduePayments
} from '../services/maturityPaymentService.js';

/**
 * Start the maturity payment scheduler
 * Runs every 3 seconds for DEMO purposes (instant maturity detection)
 *
 * Note: For production, change to daily using cron
 */
export function startMaturityPaymentScheduler() {
  console.log('Starting maturity payment scheduler...');

  // Run every 3 seconds for DEMO
  const INTERVAL_MS = 3000; // 3 seconds

  const intervalId = setInterval(async () => {
    console.log(`\n[${new Date().toISOString()}] Running maturity payment check...`);

    try {
      // Step 1: Process matured NFTs
      console.log('Step 1: Processing matured NFTs...');
      const maturedResult = await processMaturedNFTs();

      if (maturedResult.success) {
        if (maturedResult.processed > 0) {
          console.log(`✅ Processed ${maturedResult.processed} matured NFT(s)`);
        }
      } else {
        console.error('❌ Error processing matured NFTs:', maturedResult.error);
      }

      // Step 2: Mark overdue payments
      console.log('Step 2: Marking overdue payments...');
      const overdueResult = await markOverduePayments();

      if (overdueResult.success) {
        if (overdueResult.marked > 0) {
          console.log(`✅ Marked ${overdueResult.marked} payment(s) as overdue`);
        }
      } else {
        console.error('❌ Error marking overdue payments:', overdueResult.error);
      }

      console.log('✅ Maturity payment check completed successfully');

    } catch (error) {
      console.error('❌ Error during scheduled maturity payment check:', error);
    }
  }, INTERVAL_MS);

  console.log(`🚀 Maturity payment scheduler started. Running every 3 seconds (DEMO MODE).`);

  // Run immediately on startup to process any pending matured NFTs
  console.log('Running initial maturity payment check...');
  Promise.all([
    processMaturedNFTs(),
    markOverduePayments()
  ])
    .then(([maturedResult, overdueResult]) => {
      console.log(`Initial check completed: ${maturedResult.processed || 0} matured, ${overdueResult.marked || 0} overdue`);
    })
    .catch(error => console.error('Error in initial maturity payment check:', error));

  return intervalId;
}

/**
 * Stop the maturity payment scheduler
 */
export function stopMaturityPaymentScheduler(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('Maturity payment scheduler stopped');
  }
}
