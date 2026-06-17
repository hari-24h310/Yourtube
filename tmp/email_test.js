import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { sendInvoiceEmail } from '../utils/emailService.js';

(async () => {
  try {
    const ok = await sendInvoiceEmail({
      email: 'your-test@example.com',
      planName: 'Test Plan',
      amount: 10,
      paymentId: 'p_test',
      orderId: 'o_test',
      expiryDate: new Date(),
    });
    console.log('SEND_RESULT', ok);
  } catch (e) {
    console.error('SEND_ERROR', e && e.message);
    process.exit(1);
  }
})();
