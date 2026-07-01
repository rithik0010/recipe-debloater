import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateUserPlan } from '@/lib/services/db';

// ─── Razorpay webhook verification ───────────────────────────────────────────
// Razorpay signs webhooks with HMAC-SHA256 using your webhook secret

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// ─── Razorpay webhook event types we care about ───────────────────────────────
interface RazorpayWebhookEvent {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        notes?: Record<string, string>;
        amount: number;
        currency: string;
      };
    };
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  // Verify signature
  if (!signature || !verifyRazorpaySignature(body, signature, webhookSecret)) {
    console.error('Invalid Razorpay webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(body) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  console.log(`📦 Razorpay event: ${event.event}`);

  switch (event.event) {
    // ── Subscription activated (user paid) ──────────────────────────────────
    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = event.payload.subscription?.entity;
      const userId = sub?.notes?.userId;
      if (userId) {
        await updateUserPlan(userId, 'pro');
        console.log(`✅ User ${userId} upgraded to Pro (subscription: ${sub?.id})`);
      }
      break;
    }

    // ── One-time payment captured ────────────────────────────────────────────
    case 'payment.captured': {
      const payment = event.payload.payment?.entity;
      const userId = payment?.notes?.userId;
      if (userId) {
        await updateUserPlan(userId, 'pro');
        console.log(`✅ User ${userId} upgraded to Pro (payment: ${payment?.id})`);
      }
      break;
    }

    // ── Subscription cancelled / expired ────────────────────────────────────
    case 'subscription.cancelled':
    case 'subscription.expired':
    case 'subscription.completed': {
      const sub = event.payload.subscription?.entity;
      const userId = sub?.notes?.userId;
      if (userId) {
        await updateUserPlan(userId, 'free');
        console.log(`⚠️ User ${userId} downgraded to Free (subscription: ${sub?.id})`);
      }
      break;
    }

    default:
      console.log(`Unhandled Razorpay event: ${event.event}`);
  }

  return NextResponse.json({ received: true });
}
