import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../../server/db/index.js";
import { users } from "../../server/db/schema.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

export class StripeService {
  /**
   * Crea una sesión de checkout para una suscripción
   */
  async createCheckoutSession(userId: string, email: string, plan: "pro" | "max") {
    const priceId =
      plan === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_MAX_PRICE_ID;

    if (!priceId) throw new Error(`Price ID for plan ${plan} not configured`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL}/dashboard?status=success`,
      cancel_url: `${process.env.APP_URL}/dashboard?status=cancel`,
      metadata: { userId },
    });

    return session;
  }

  /**
   * Crea una sesión de portal de cliente (para gestionar suscripción)
   */
  async createPortalSession(stripeCustomerId: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.APP_URL}/dashboard`,
    });
    return session;
  }

  /**
   * Maneja webhooks de Stripe
   */
  async handleWebhook(event: Stripe.Event) {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;

      if (userId) {
        // Actualizar usuario con su customerId y plan inicial
        await db
          .update(users)
          .set({
            stripeCustomerId: customerId,
            plan: "pro", // O extraer del line_item si es dinámico
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Determinar nuevo plan basado en status
      let newPlan: "free" | "pro" | "max" = "free";
      if (subscription.status === "active") {
        // Lógica para mapear priceId -> plan
        newPlan = "pro";
      }

      await db
        .update(users)
        .set({ plan: newPlan, updatedAt: new Date() })
        .where(eq(users.stripeCustomerId, customerId));
    }
  }
}

export const stripeService = new StripeService();
