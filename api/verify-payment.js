import crypto from 'crypto';
import { getFirestore } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      userId,
    } = req.body || {};

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // This is the step that actually proves the payment is real -
    // never trust the frontend claiming "payment succeeded" without this check.
    const body = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const db = getFirestore();
    await db.collection('users').doc(userId).set(
      {
        subscription_status: 'active',
        razorpay_subscription_id,
        last_payment_id: razorpay_payment_id,
        next_billing_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
      { merge: true }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('verify-payment error:', err.message);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
