import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST() {
  try {
    // 1. Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Look up stripe_customer_id from sw_subscriptions
    const { data: subscription, error: subError } = await supabase
      .from("sw_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account associated with this subscription" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // 3. Create billing portal session
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    // 4. Return portal URL
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
