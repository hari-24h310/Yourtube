import sgMail from "@sendgrid/mail";
 
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 
// Send invoice email
export const sendInvoiceEmail = async ({
  email,
  planName,
  amount,
  paymentId,
  orderId,
  expiryDate,
  planDetails = {},
}) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      throw new Error("SENDGRID_API_KEY is not configured. Set it in environment variables");
    }
 
    const invoiceHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Confirmation & Invoice</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0066cc;">Upgrade Successful! 🎉</h3>
          <p style="font-size: 16px; color: #666;">
            Your plan has been upgraded successfully.
          </p>
        </div>
 
        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Invoice Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: bold; color: #333;">Plan Name</td>
              <td style="padding: 10px 0; text-align: right; color: #666;">${planName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: bold; color: #333;">Amount Paid</td>
              <td style="padding: 10px 0; text-align: right; color: #666;">₹${amount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: bold; color: #333;">Payment ID</td>
              <td style="padding: 10px 0; text-align: right; color: #666; font-family: monospace;">${paymentId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: bold; color: #333;">Order ID</td>
              <td style="padding: 10px 0; text-align: right; color: #666; font-family: monospace;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">Valid Until</td>
              <td style="padding: 10px 0; text-align: right; color: #666;">${new Date(expiryDate).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
 
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #0066cc; font-weight: bold;">Plan details:</p>
          <ul style="color: #666; margin: 10px 0; padding-left: 20px;">
            <li>Watch time: ${planDetails.watchTimeLimit || "As per plan"}</li>
            <li>Downloads: ${planDetails.downloadLimit || "Unlimited"}</li>
            <li>Validity: ${planDetails.validity || "30 days"}</li>
          </ul>
        </div>
 
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #0066cc; font-weight: bold;">Benefits of your new plan:</p>
          <ul style="color: #666; margin: 10px 0; padding-left: 20px;">
            <li>Unlimited downloads</li>
            <li>Extended watch time per video</li>
            <li>Priority support</li>
            <li>Ad-free experience</li>
          </ul>
        </div>
 
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this email.
            If you have any questions, contact us at support@yourtube.com
          </p>
        </div>
      </div>
    `;
 
    const msg = {
      to: email,
      from: "hariharan936197@gmail.com",
      subject: `YourTube ${planName} Plan - Payment Confirmation`,
      html: invoiceHtml,
    };
 
    await sgMail.send(msg);
 
    console.log("Invoice email sent to:", email);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
};
 
