import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateUserPlan } from '@/lib/services/db';

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    subscription?: { entity: { id: string; status: string; notes?: Record<string, string> } };
    payment?: { entity: { id: string; notes?: Record<string, string>; amount: number } };
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if (!signature || !verifyRazorpaySignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body) as RazorpayWebhookEvent;
  console.log(`📦 Razorpay: ${event.event}`);

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'payment.captured': {
      const userId =
        event.payload.subscription?.entity.notes?.userId ??
        event.payload.payment?.entity.notes?.userId;
      if (userId) { await updateUserPlan(userId, 'pro'); }
      break;
    }
    case 'subscription.cancelled':
    case 'subscription.expired': {
      const userId = event.payload.subscription?.entity.notes?.userId;
      if (userId) { await updateUserPlan(userId, 'free'); }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
