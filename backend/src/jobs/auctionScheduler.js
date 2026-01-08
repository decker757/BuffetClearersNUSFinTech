import { processExpiredAuctions } from '../services/auctionFinalizationService.js';

/**
 * Start the auction finalization scheduler
 * Runs every 3 seconds for DEMO purposes (instant finalization)
 *
 * Note: For production, change to every 5 minutes using cron
 */
export function startAuctionScheduler() {
  console.log('Starting auction finalization scheduler...');

  // Run every 3 seconds for DEMO
  const INTERVAL_MS = 3000; // 3 seconds

  const intervalId = setInterval(async () => {
    console.log(`\n[${new Date().toISOString()}] Running auction finalization check...`);

    try {
      await processExpiredAuctions();
      console.log('Auction finalization check completed successfully');
    } catch (error) {
      console.error('Error during scheduled auction finalization:', error);
    }
  }, INTERVAL_MS);

  console.log(`🚀 Auction scheduler started. Running every 3 seconds (DEMO MODE).`);

  // Run immediately on startup to process any pending auctions
  processExpiredAuctions()
    .then(() => console.log('Initial auction finalization check completed'))
    .catch(error => console.error('Error in initial auction finalization:', error));

  return intervalId;
}

/**
 * Stop the auction scheduler
 */
export function stopAuctionScheduler(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('Auction scheduler stopped');
  }
}
