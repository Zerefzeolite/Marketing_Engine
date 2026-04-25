/**
 * Marketing Engine Pricing Configuration
 * 
 * Centralized pricing configuration - update costs when providers change.
 * 
 * INTERNAL - Not exposed to customers
 * 
 * Provider Setup:
 * - Email: Sign up at https://mailchimp.com (free up to 10k emails/mo)
 * - SMS: Sign up at https://plivo.com ($2 credit trial)
 */

export const PROVIDER_COSTS = {
  email: {
    costPerMessage: 0.003,  // Brevo ~$0.003/email (300/day free)
    provider: "Brevo",
  },
  sms: {
    costPerMessage: 0.0075,  // Twilio ~$0.0075/sms to Jamaica
    provider: "Twilio",
  },
} as const

export const CUSTOMER_PRICING = {
  email: {
    perContact: 0.008,
    displayName: "Email",
  },
  sms: {
    perContact: 0.025,
    displayName: "SMS",
  },
} as const

export const PACKAGE_TIERS = {
  starter: {
    name: "Starter",
    description: "Sample size",
    sends: 2,
    markup: 1.5,
    displayTag: "Cost Effective",
  },
  growth: {
    name: "Growth",
    description: "Standard",
    sends: 4,
    markup: 2.0,
    displayTag: "Popular",
  },
  premium: {
    name: "Premium",
    description: "Best Fit",
    sends: 4,
    markup: 2.5,
    displayTag: "Recommended",
  },
} as const

export const TEMPLATE_ADDONS = {
  basic: {
    name: "Basic",
    cost: 0,
    price: 0,
  },
  enhanced: {
    name: "Enhanced",
    cost: 15,
    price: 50,
  },
  premium: {
    name: "Premium",
    cost: 40,
    price: 150,
  },
} as const

export const DURATION_MULTIPLIERS = {
  weekly: {
    sends: 4,
    multiplier: 1.0,
    displayName: "Weekly",
  },
  biweekly: {
    sends: 2,
    multiplier: 0.6,
    displayName: "Bi-Weekly",
  },
  monthly: {
    sends: 1,
    multiplier: 0.4,
    displayName: "Monthly",
  },
  quarterly: {
    sends: 1,
    multiplier: 0.25,
    displayName: "Quarterly",
  },
} as const

export const QUALITY_WEIGHTS = {
  standard: 1.0,
  responsive: 1.3,
  high_value: 1.6,
} as const

export const PREMIUM_QUALITY_MULTIPLIER = 1.25

export const JMD_EXCHANGE_RATE = 155

export function calculateMargin(
  channel: "email" | "sms",
  contacts: number,
  sends: number
): { cost: number; revenue: number; margin: number; marginPercent: number } {
  const providerCost = PROVIDER_COSTS[channel].costPerMessage
  const customerPrice = CUSTOMER_PRICING[channel].perContact
  
  const cost = contacts * providerCost * sends
  const revenue = contacts * customerPrice * sends
  const margin = revenue - cost
  const marginPercent = (margin / revenue) * 100
  
  return { cost, revenue, margin, marginPercent }
}

export function calculatePackagePrice(
  contacts: number,
  channel: "email" | "sms",
  tier: keyof typeof PACKAGE_TIERS
): number {
  const basePrice = CUSTOMER_PRICING[channel].perContact
  const sends = PACKAGE_TIERS[tier].sends
  const markup = PACKAGE_TIERS[tier].markup
  
  return Math.round(contacts * basePrice * sends * markup)
}

export function calculateTotalWithAddons(
  packagePrice: number,
  templateTier: keyof typeof TEMPLATE_ADDONS,
  duration: keyof typeof DURATION_MULTIPLIERS
): number {
  const templatePrice = TEMPLATE_ADDONS[templateTier].price
  const durationMultiplier = DURATION_MULTIPLIERS[duration].multiplier
  
  const durationAdjusted = packagePrice * durationMultiplier
  
  return Math.round(durationAdjusted + templatePrice)
}