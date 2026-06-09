import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  starter:    process.env.STRIPE_STARTER_PRICE_ID!,
  growth:     process.env.STRIPE_GROWTH_PRICE_ID!,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
};

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/v1/billing/status
  app.get('/status', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { plan: true, stripeStatus: true, trialEndsAt: true },
    });
    return { data: tenant };
  });

  // POST /api/v1/billing/checkout
  app.post<{ Body: { plan: string } }>('/checkout', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { plan } = request.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${process.env.WEB_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEB_URL}/billing`,
      metadata: { tenantId: tenant.id, plan },
      subscription_data: {
        trial_period_days: 14,
        metadata: { tenantId: tenant.id },
      },
    });

    return { data: { url: session.url } };
  });

  // POST /api/v1/billing/portal
  app.post('/portal', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
    });

    if (!tenant?.stripeCustomerId) {
      return reply.status(400).send({ error: 'No billing account' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${process.env.WEB_URL}/billing`,
    });

    return { data: { url: session.url } };
  });
}
