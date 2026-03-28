import { retryFailedStripeBillingReports } from '../stripeBilling';
import { TaskJob } from '../types';

export default class RetryStripeBillingReports extends TaskJob {
  constructor() {
    super('retryStripeBillingReports', '*/10 * * * *');
  }

  async run() {
    const retried = await retryFailedStripeBillingReports();
    this.logger.info(`Retried ${retried} failed Stripe billing reports.`);
  }
}
