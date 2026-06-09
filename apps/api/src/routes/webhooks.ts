import type { FastifyInstance } from 'fastify';
import { Webhook } from 'svix';
import Stripe from 'stripe';
import { prisma } from '../index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function webhookRoutes(app: FastifyInstance) {

  // ── CLERK WEBHOOKS ────────────────────────────────────────────────────────
  // Fired when orgs/users are created or deleted in Clerk

  app.post('/clerk', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = wh.verify(
        request.rawBody as string,
        {
          'svix-id': request.headers['svix-id'] as string,
          'svix-timestamp': request.headers['svix-timestamp'] as string,
          'svix-signature': request.headers['svix-signature'] as string,
        }
      ) as typeof event;
    } catch {
      return reply.status(400).send({ error: 'Invalid webhook signature' });
    }

    switch (event.type) {
      case 'organization.created': {
        const org = event.data as { id: string; name: string; slug: string };
        await prisma.tenant.create({
          data: {
            clerkOrgId: org.id,
            name: org.name,
            slug: org.slug || org.id,
            plan: 'starter',
          },
        });
        break;
      }

      case 'organization.deleted': {
        const org = event.data as { id: string };
        await prisma.tenant.delete({
          where: { clerkOrgId: org.id },
        }).catch(() => {/* already deleted */});
        break;
      }

      case 'organizationMembership.created': {
        const membership = event.data as {
          organization: { id: string };
          public_user_data: {
            user_id: string;
            first_name: string;
            last_name: string;
            identifier: string;
            image_url: string;
          };
          role: string;
        };

        const tenant = await prisma.tenant.findUnique({
          where: { clerkOrgId: membership.organization.id },
        });
        if (!tenant) break;

        await prisma.tenantUser.upsert({
          where: {
            tenantId_clerkUserId: {
              tenantId: tenant.id,
              clerkUserId: membership.public_user_data.user_id,
            },
          },
          create: {
            tenantId: tenant.id,
            clerkUserId: membership.public_user_data.user_id,
            email: membership.public_user_data.identifier,
            name: `${membership.public_user_data.first_name} ${membership.public_user_data.last_name}`.trim(),
            role: membership.role === 'org:admin' ? 'admin' : 'member',
            avatarUrl: membership.public_user_data.image_url,
          },
          update: {
            role: membership.role === 'org:admin' ? 'admin' : 'member',
          },
        });
        break;
      }

      case 'organizationMembership.deleted': {
        const membership = event.data as {
          organization: { id: string };
          public_user_data: { user_id: string };
        };
        const tenant = await prisma.tenant.findUnique({
          where: { clerkOrgId: membership.organization.id },
        });
        if (!tenant) break;
        await prisma.tenantUser.deleteMany({
          where: {
            tenantId: tenant.id,
            clerkUserId: membership.public_user_data.user_id,
          },
        });
        break;
      }
    }

    return { received: true };
  });

  // ── STRIPE WEBHOOKS ───────────────────────────────────────────────────────

  app.post('/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody as string,
        request.headers['stripe-signature'] as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      return reply.status(400).send({ error: 'Invalid webhook signature' });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata.tenantId;
        if (!tenantId) break;

        const priceId = sub.items.data[0]?.price.id;
        const plan = Object.entries({
          starter: process.env.STRIPE_STARTER_PRICE_ID,
          growth: process.env.STRIPE_GROWTH_PRICE_ID,
          enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        }).find(([, id]) => id === priceId)?.[0] || 'starter';

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan,
            stripeSubscriptionId: sub.id,
            stripeStatus: sub.status,
            trialEndsAt: sub.trial_end
              ? new Date(sub.trial_end * 1000)
              : null,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata.tenantId;
        if (!tenantId) break;
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { plan: 'starter', stripeStatus: 'canceled' },
        });
        break;
      }
    }

    return { received: true };
  });
}
