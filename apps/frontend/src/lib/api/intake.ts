import {
  IntakeSubmitResponseSchema,
  type IntakeSubmitRequest,
  IntakeSubmitRequestSchema,
  type PackageOption,
} from "../contracts/intake"
import {
  IntakeEstimateResponseSchema,
  IntakeRecommendResponseSchema,
  RecommendationPreviewSchema,
  type RecommendationPreviewData,
} from "../contracts/recommendation"

const CHANNEL_COSTS = {
  email: 0.008,
  sms: 0.025,
  both: 0.012,
}

const COST_PER_CONTACT = {
  email: 0.008,
  sms: 0.025,
  both: 0.012,
}

const COST_PER_CONTACT_JMD = {
  email: 1.30,
  sms: 4.00,
  both: 1.95,
}

const DURATION_MULTIPLIERS = {
  weekly: 4,
  biweekly: 2,
  monthly: 1,
  quarterly: 0.33,
}

const MARKUP_MULTIPLIER = 2.0

const PACKAGE_DISCOUNTS = {
  starter: 0,
  growth: 0.15,
  premium: 0.25,
}

const MOCKUP_LEVELS = {
  starter: 1,
  growth: 2,
  premium: 3,
}

const MOCKUP_COST_USD = {
  basic: 0,
  enhanced: 50,
  premium: 150,
}

const MOCKUP_COST_JMD = {
  basic: 0,
  enhanced: 8000,
  premium: 24000,
}

export const PACKAGE_TIERS = {
  starter: {
    name: "Starter",
    description: "Sample size",
    sends: 2,
    markup: 1.5,
  },
  growth: {
    name: "Growth",
    description: "Standard",
    sends: 4,
    markup: 2.0,
  },
  premium: {
    name: "Premium",
    description: "Best Fit",
    sends: 4,
    markup: 2.5,
  },
}

function calculatePackagePricing(
  contactRange: number,
  channel: string,
  duration: string = "monthly",
  budgetMax?: number,
  isClientMode: boolean = false,
): PackageOption[] {
  const costPerContact = COST_PER_CONTACT[channel as keyof typeof COST_PER_CONTACT] || COST_PER_CONTACT.email
  const costPerContactJMD = COST_PER_CONTACT_JMD[channel as keyof typeof COST_PER_CONTACT_JMD] || COST_PER_CONTACT_JMD.email
  
  const reach = contactRange
  const potentialReach = Math.round(reach)

  const packages: PackageOption[] = Object.entries(PACKAGE_TIERS).map(([tierKey, tierConfig]) => {
    const sends = tierConfig.sends
    const markup = tierConfig.markup
    const price = Math.round(reach * costPerContact * sends * markup)
    const priceJMD = Math.round(price * 155)

    return {
      name: tierKey,
      reach: potentialReach,
      price,
      price_jmd: priceJMD,
      cost_per_contact: isClientMode ? costPerContact * markup : costPerContact,
      cost_per_contact_jmd: isClientMode ? costPerContactJMD * markup : costPerContactJMD,
      channel_split: channel === "both" ? "email: 60%, sms: 40%" : channel === "email" ? "email: 100%" : "sms: 100%",
      within_budget: price <= (budgetMax ?? price),
    }
  })

  return packages
}

export function generateRecommendation(
  request: IntakeSubmitRequest,
): RecommendationPreviewData {
  const parsed = IntakeSubmitRequestSchema.parse(request)

  const budgetMin = parsed.budget_min ?? 100
  const budgetMax = parsed.budget_max ?? parsed.budget_min ?? budgetMin
  const isClientMode = parsed.is_client_mode ?? false
  const mockupLevel = parsed.mockup_level ?? "basic"

  const channel = parsed.preferred_channel || "email"
  const costPerContact = COST_PER_CONTACT[channel as keyof typeof COST_PER_CONTACT] || COST_PER_CONTACT.email
  const duration = parsed.campaign_duration || "monthly"
  const estimatedReachable = Math.max(100, Math.round(budgetMin / costPerContact))

  const packageOptions = calculatePackagePricing(estimatedReachable, channel, duration, budgetMax, isClientMode)
  
  const affordablePackages = packageOptions.filter(p => p.within_budget)
  const recommendedPackage = affordablePackages.length > 0 
    ? (affordablePackages[0].name === "starter" ? "starter" : affordablePackages[0].name === "growth" ? "growth" : "premium")
    : packageOptions.some(p => p.name === "growth") ? "growth" : "starter"
  
  const defaultPackage = packageOptions.find(p => p.name === recommendedPackage) || packageOptions[0]
  
  const sendsCount = DURATION_MULTIPLIERS[duration]
  const channelSplit = 
    channel === "both" ? "email: 60%, sms: 40%" 
    : channel === "email" ? "email: 100%" 
    : "sms: 100%"
  const confidence = parsed.campaign_objective.trim().length >= 12 ? 0.88 : 0.72

  const mockupUpgradeCostUSD = mockupLevel !== "basic" ? MOCKUP_COST_USD[mockupLevel] ?? 0 : 0
  const mockupUpgradeCostJMD = mockupLevel !== "basic" ? MOCKUP_COST_JMD[mockupLevel] ?? 0 : 0
  const mockupPackageLevel = MOCKUP_LEVELS[recommendedPackage as keyof typeof MOCKUP_LEVELS] || 1
  const requestedMockupLevel = MOCKUP_LEVELS[mockupLevel as keyof typeof MOCKUP_LEVELS] || 1

  const rationale = `${duration.charAt(0).toUpperCase() + duration.slice(1)} campaign (${sendsCount} sends). ${defaultPackage.name.charAt(0).toUpperCase() + defaultPackage.name.slice(1)} Package: $${defaultPackage.price.toLocaleString()} for ${defaultPackage.reach.toLocaleString()} contacts.`
    + (isClientMode ? ` Client Price: $${defaultPackage.price.toLocaleString()} (USD) / $${defaultPackage.price_jmd.toLocaleString()} (JMD)` : ` Cost/contact: $${defaultPackage.cost_per_contact.toFixed(3)}`)

  return RecommendationPreviewSchema.parse({
    estimated_reachable: estimatedReachable,
    recommended_package: recommendedPackage,
    campaign_duration: duration,
    channel_split: channelSplit,
    rationale_summary: rationale,
    confidence,
    estimated_price: defaultPackage.price,
    cost_per_contact: defaultPackage.cost_per_contact,
    package_options: packageOptions,
    is_client_mode: isClientMode,
    mockup_level: mockupLevel,
    mockup_upgrade_cost_usd: mockupUpgradeCostUSD,
    mockup_upgrade_cost_jmd: mockupUpgradeCostJMD,
    total_budget_needed: defaultPackage.price + mockupUpgradeCostUSD,
  })
}

export async function fetchRecommendationFromApi(
  request: IntakeSubmitRequest,
  apiBaseUrl?: string,
): Promise<{ requestId: string; summary: Record<string, string>; recommendation: RecommendationPreviewData }> {
  const parsed = IntakeSubmitRequestSchema.parse(request)
  
  const recommendation = generateRecommendation(parsed)

  const requestId = `REQ-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  const summary: Record<string, string> = {
    business_name: parsed.business_name,
    preferred_channel: parsed.preferred_channel,
    campaign_objective: parsed.campaign_objective,
    campaign_duration: parsed.campaign_duration || "monthly",
  }

  return {
    requestId,
    summary,
    recommendation,
  }
}