import UserPlan from "../Models/UserPlan.js";
import User from "../Models/Auth.js";
import { sendInvoiceEmail } from "../utils/emailService.js";

export const startSubscriptionExpiryJob = (intervalMs = 1000 * 60 * 60) => {
  // Run immediately then every `intervalMs` milliseconds (default: 1 hour)
  const checkOnce = async () => {
    try {
      const now = new Date();
      const expiredPlans = await UserPlan.find({
        isActive: true,
        expiryDate: { $lte: now },
        planType: { $ne: "free" },
      });

      for (const plan of expiredPlans) {
        try {
          // deactivate old plan
          await UserPlan.findByIdAndUpdate(plan._id, { isActive: false });

          // create a new free plan for the user
          const newPlan = await UserPlan.create({
            userId: plan.userId,
            planType: "free",
            downloadLimit: 1,
            watchTimeLimit: 5,
            isActive: true,
            startDate: new Date(),
            expiryDate: null,
          });

          // send expiry notification email if user has email
          const user = await User.findById(plan.userId);
          if (user && user.email) {
            try {
              await sendInvoiceEmail({
                email: user.email,
                planName: `Subscription expired - downgraded to Free`,
                amount: 0,
                paymentId: `expiry_${Date.now()}`,
                orderId: plan.razorpayOrderId || `expiry_${Date.now()}`,
                expiryDate: plan.expiryDate || new Date(),
              });
            } catch (e) {
              console.error("Failed to send expiry email to", user.email, e);
            }
          }
        } catch (e) {
          console.error("Error processing expired plan", plan._id, e);
        }
      }
    } catch (error) {
      console.error("Subscription expiry job error:", error);
    }
  };

  // initial run
  checkOnce();

  // schedule
  const id = setInterval(checkOnce, intervalMs);

  return () => clearInterval(id);
};

export default startSubscriptionExpiryJob;
