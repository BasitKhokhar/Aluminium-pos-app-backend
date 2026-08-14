
const app = require('./app');
const startCronJobs = require('./cron');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  startCronJobs();
});
