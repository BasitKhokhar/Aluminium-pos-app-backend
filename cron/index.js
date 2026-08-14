const cron = require('node-cron');
const expireSubscriptions = require('./expireSubscriptions');

// Guarded by ENABLE_CRON so a multi-instance deployment doesn't run the same
// job N times without a job lock — fine to leave unset on a single VPS.
function startCronJobs() {
    if (process.env.ENABLE_CRON !== 'true') {
        console.log('[cron] ENABLE_CRON is not "true" — cron jobs disabled');
        return;
    }

    // Every hour, on the hour.
    cron.schedule('0 * * * *', () => {
        expireSubscriptions().catch((err) => console.error('[cron] expireSubscriptions failed:', err));
    });

    // Also run once at boot so a long-stopped server catches up immediately.
    expireSubscriptions().catch((err) => console.error('[cron] expireSubscriptions failed:', err));

    console.log('[cron] Subscription expiry job scheduled (hourly)');
}

module.exports = startCronJobs;
