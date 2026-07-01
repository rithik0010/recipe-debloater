import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// ─── Razorpay Pro plan pricing ────────────────────────────────────────────────
const PRO_AMOUNT_INR = 41900;    // ₹419/month (≈ $4.99 USD)
const PRO_AMOUNT_USD = 499;      // $4.99/month in cents (for reference)
const CURRENCY       = 'INR';

function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(req: NextRequest) {
  // ── Authenticate user ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // ── Create Razorpay order ──────────────────────────────────────────────────
  let rzp: Razorpay;
  try {
    rzp = getRazorpay();
  } catch {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }

  try {
    const order = await rzp.orders.create({
      amount:   PRO_AMOUNT_INR,
      currency: CURRENCY,
      receipt:  `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        email:  user.email ?? '',
        plan:   'pro',
      },
    });

    return NextResponse.json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Order creation failed';
    console.error('Razorpay order error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
