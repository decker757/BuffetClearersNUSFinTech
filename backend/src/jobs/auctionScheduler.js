import cron from 'node-cron';
import { processExpiredAuctions } from '../services/auctionFinalizationService.js';

/**
 * Start the auction finalization scheduler
 * Runs every 5 minutes to check for and process expired auctions
 */
export function startAuctionScheduler() {
  console.log('Starting auction finalization scheduler...');

  // Run every 5 minutes: '*/5 * * * *'
  // For testing, you can use '* * * * *' to run every minute
  const schedule = '*/5 * * * *';

  const task = cron.schedule(schedule, async () => {
    console.log(`\n[${new Date().toISOString()}] Running auction finalization check...`);

    try {
      await processExpiredAuctions();
      console.log('Auction finalization check completed successfully');
    } catch (error) {
      console.error('Error during scheduled auction finalization:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log(`Auction scheduler started. Running every 5 minutes.`);

  // Run immediately on startup to process any pending auctions
  processExpiredAuctions()
    .then(() => console.log('Initial auction finalization check completed'))
    .catch(error => console.error('Error in initial auction finalization:', error));

  return task;
}

/**
 * Stop the auction scheduler
 */
export function stopAuctionScheduler(task) {
  if (task) {
    task.stop();
    console.log('Auction scheduler stopped');
  }
}
