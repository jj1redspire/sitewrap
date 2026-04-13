import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

interface CheckoutBody {
  price_id: string;
  plan_tier: "project" | "unlimited";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: CheckoutBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { price_id, plan_tier } = body;

    if (!price_id || !plan_tier) {
      return NextResponse.json(
        { error: "Missing required fields: price_id and plan_tier" },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // 3. Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          plan_tier,
        },
      },
      success_url: `${appUrl}/projects?success=true`,
      cancel_url: `${appUrl}/#pricing`,
      metadata: {
        user_id: user.id,
        plan_tier,
      },
    });

    // 4. Return checkout URL
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
