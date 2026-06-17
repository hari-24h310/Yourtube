import UserPlan from "../Models/UserPlan.js";
import mongoose from "mongoose";

export const upgradeUserPlan = async (
  userId,
  planType,
  paymentId,
  orderId
) => {
  const durationMap = {
    bronze: 30,
    silver: 30,
    gold: 30,
  };

  const expiryDate =
    planType === "free"
      ? null
      : new Date(Date.now() + (durationMap[planType] || 0) * 24 * 60 * 60 * 1000);

  await UserPlan.updateMany({ userId }, { isActive: false });

  return UserPlan.create({
    userId,
    planType,
    isActive: true,
    startDate: new Date(),
    expiryDate,
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
    downloadLimit: planType === "free" ? 1 : -1,
    watchTimeLimit:
      planType === "bronze"
        ? 7
        : planType === "silver"
        ? 10
        : planType === "gold"
        ? -1
        : 5,
  });
};

/**
 * GET current active plan of user
 * GET /plan/:userId
 */
export const getPlan = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const plan = await UserPlan.findOne({
      userId,
      isActive: true,
    }).lean();

    return res.json(
      plan || {
        planType: "free",
        watchTimeLimit: 5,
        downloadLimit: 1,
      }
    );
  } catch (err) {
    console.error("getPlan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPGRADE PLAN (called after Razorpay success)
 * POST /plan/upgrade
 */
export const upgradePlan = async (req, res) => {
  try {
    const { userId, planType, paymentId, orderId } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({ message: "Missing data" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const durationMap = {
      bronze: 30,
      silver: 30,
      gold: 30,
    };

    const expiryDate =
      planType === "free"
        ? null
        : new Date(Date.now() + (durationMap[planType] || 0) * 24 * 60 * 60 * 1000);

    // deactivate old plans
    await UserPlan.updateMany({ userId }, { isActive: false });

    // create new plan
    const newPlan = await UserPlan.create({
      userId,
      planType,
      isActive: true,
      startDate: new Date(),
      expiryDate,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      downloadLimit: planType === "free" ? 1 : -1,
      watchTimeLimit:
        planType === "bronze"
          ? 7
          : planType === "silver"
          ? 10
          : planType === "gold"
          ? -1
          : 5,
    });

    return res.json({
      message: "Plan upgraded successfully",
      plan: newPlan,
    });
  } catch (err) {
    console.error("upgradePlan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};