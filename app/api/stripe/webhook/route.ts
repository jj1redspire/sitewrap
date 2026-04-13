import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
}

// App Router: read raw body as text for Stripe signature verification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Stripe webhook verification error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Use service client — no user context in webhooks
  const supabase = createServiceClient();

  // Helper: get current_period_end from subscription items (Stripe v22+)
  function getPeriodEnd(sub: Stripe.Subscription): string {
    const item = sub.items?.data?.[0];
    if (item && "current_period_end" in item) {
      return new Date((item as Stripe.SubscriptionItem).current_period_end * 1000).toISOString();
    }
    // Fallback: use billing_cycle_anchor + 30 days as rough estimate
    return new Date(sub.billing_cycle_anchor * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Helper: get subscription ID from Invoice.parent (Stripe v22+)
  function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    const parent = invoice.parent;
    if (!parent) return null;
    if (parent.type === "subscription_details" && parent.subscription_details) {
      const sub = parent.subscription_details.subscription;
      return typeof sub === "string" ? sub : (sub as Stripe.Subscription)?.id ?? null;
    }
    return null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id;
        const planTier = session.metadata?.plan_tier as
          | "project"
          | "unlimited";
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as Stripe.Customer)?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;

        if (!userId || !customerId || !subscriptionId) {
          console.error("checkout.session.completed: missing metadata", {
            userId,
            customerId,
            subscriptionId,
          });
          break;
        }

        // Fetch subscription to get period end from items
        const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ["items"],
        });

        const currentPeriodEnd = getPeriodEnd(sub);

        const { error } = await supabase.from("sw_subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_sub_id: subscriptionId,
            plan_tier: planTier ?? "project",
            status: sub.status,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("sw_subscriptions upsert error:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const planTier = sub.metadata?.plan_tier as
          | "project"
          | "unlimited"
          | undefined;
        const currentPeriodEnd = getPeriodEnd(sub);

        const updatePayload: Record<string, unknown> = {
          status: sub.status,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        };
        if (planTier) {
          updatePayload.plan_tier = planTier;
        }

        if (userId) {
          const { error } = await supabase
            .from("sw_subscriptions")
            .update(updatePayload)
            .eq("user_id", userId);

          if (error) {
            console.error("subscription.updated by user_id error:", error);
          }
        } else {
          // Fall back to looking up by stripe_sub_id
          const { error } = await supabase
            .from("sw_subscriptions")
            .update(updatePayload)
            .eq("stripe_sub_id", sub.id);

          if (error) {
            console.error("subscription.updated by sub_id error:", error);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("sw_subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_sub_id", sub.id);

        if (error) {
          console.error("subscription.deleted error:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);

        if (!subscriptionId) {
          console.error("invoice.payment_failed: no subscription id found");
          break;
        }

        const { error } = await supabase
          .from("sw_subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_sub_id", subscriptionId);

        if (error) {
          console.error("payment_failed update error:", error);
        }
        break;
      }

      default:
        // Unhandled event type — not an error
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (handlerError) {
    console.error("Webhook handler error:", handlerError);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
