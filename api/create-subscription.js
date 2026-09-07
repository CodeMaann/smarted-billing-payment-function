import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: 120, // effectively "until cancelled" (10 years of monthly cycles)
      notes: { userId, email: email || '' },
    });

    return res.status(200).json({ subscriptionId: subscription.id });
  } catch (err) {
    console.error('create-subscription error:', err.message);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
}
