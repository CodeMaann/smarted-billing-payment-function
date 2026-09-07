import crypto from 'crypto';
import { getFirestore } from './_firebaseAdmin.js';

// Razorpay signs the RAW request body, so we must read it ourselves
// instead of letting Vercel auto-parse it as JSON.
export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    const db = getFirestore();

    if (event.event === 'subscription.charged') {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes && sub.notes.userId;
      if (userId) {
        await db.collection('users').doc(userId).set(
          {
            subscription_status: 'active',
            next_billing_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
          { merge: true }
        );
      }
    } else if (event.event === 'subscription.cancelled') {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes && sub.notes.userId;
      if (userId) {
        await db.collection('users').doc(userId).set(
          { subscription_status: 'cancelled' },
          { merge: true }
        );
      }
    } else if (event.event === 'payment.failed') {
      // Optional: log this for now. Could flag the user's account later.
      console.log('Payment failed event received:', event.payload);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('webhook error:', err.message);
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
}
