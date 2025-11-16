import { db } from "./db-sqlite";
import { pricingRules, campaigns, bookings, users, pricingRuleApplications, adminSettings } from "@shared/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";

// Default tiered pricing: First slot $600, additional slots +$500 each
const DEFAULT_FIRST_SLOT_PRICE = 60000; // cents
const DEFAULT_ADDITIONAL_SLOT_PRICE = 50000; // cents

export interface PricingQuote {
  totalPrice: number; // in cents
  breakdown: {
    basePrice: number; // before any discounts
    discountAmount: number; // total discount applied
    finalPrice: number; // after discount
  };
  appliedRules: Array<{
    ruleId: string;
    description: string;
    displayName?: string;
    ruleType: 'fixed_price' | 'discount_amount' | 'discount_percent';
    value: number;
  }>;
  priceSource: 'user_fixed' | 'user_discount' | 'campaign_base' | 'campaign_discount' | 'default_tiered';
}

export async function calculatePricingQuote(
  campaignId: string,
  userId: string,
  quantity: number
): Promise<PricingQuote> {
  // Validate inputs
  if (quantity < 1 || quantity > 4) {
    throw new Error("Quantity must be between 1 and 4");
  }

  // Get campaign details
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all active pricing rules that apply to this booking
  const applicableRules = await db.query.pricingRules.findMany({
    where: and(
      eq(pricingRules.status, 'active'),
      or(
        // Rules for this specific user
        eq(pricingRules.userId, userId),
        // Rules for this campaign (but not user-specific)
        and(
          eq(pricingRules.campaignId, campaignId),
          isNull(pricingRules.userId)
        ),
        // Global rules (no campaign or user restriction)
        and(
          isNull(pricingRules.campaignId),
          isNull(pricingRules.userId)
        )
      )
    ),
  });

  // Filter out rules that have reached their usage limit
  const availableRules = [];
  for (const rule of applicableRules) {
    if (rule.usageLimit === null || rule.usageCount < rule.usageLimit) {
      // For user-specific rules, check if this user has already used it
      if (rule.userId) {
        const userApplications = await db.query.pricingRuleApplications.findMany({
          where: and(
            eq(pricingRuleApplications.pricingRuleId, rule.id),
            eq(pricingRuleApplications.userId, userId)
          ),
        });
        
        if (rule.usageLimit === null || userApplications.length < rule.usageLimit) {
          availableRules.push(rule);
        }
      } else {
        availableRules.push(rule);
      }
    }
  }

  // Calculate default tiered price using campaign-specific pricing if available
  const firstSlotPrice = campaign.baseSlotPrice !== null ? campaign.baseSlotPrice : DEFAULT_FIRST_SLOT_PRICE;
  const additionalSlotPrice = campaign.additionalSlotPrice !== null ? campaign.additionalSlotPrice : DEFAULT_ADDITIONAL_SLOT_PRICE;
  const defaultPrice = firstSlotPrice + ((quantity - 1) * additionalSlotPrice);

  // Apply pricing hierarchy: user fixed > loyalty discount > user discount > campaign base > campaign discount > default
  
  // Step 1: Check for user-specific fixed price rules
  const userFixedPriceRules = availableRules.filter(
    r => r.userId === userId && r.ruleType === 'fixed_price'
  ).sort((a, b) => b.priority - a.priority);

  if (userFixedPriceRules.length > 0) {
    const rule = userFixedPriceRules[0];
    return {
      totalPrice: rule.value * quantity,
      breakdown: {
        basePrice: defaultPrice,
        discountAmount: defaultPrice - (rule.value * quantity),
        finalPrice: rule.value * quantity,
      },
      appliedRules: [{
        ruleId: rule.id,
        description: rule.description,
        displayName: rule.displayName || undefined,
        ruleType: rule.ruleType as 'fixed_price' | 'discount_amount' | 'discount_percent',
        value: rule.value,
      }],
      priceSource: 'user_fixed',
    };
  }

  // Step 2: Check for loyalty program discount (earned through repeat purchases)
  // Only apply if loyalty counters are from the current year
  const currentYear = new Date().getFullYear();
  const hasValidLoyaltyDiscount = 
    user.loyaltyYearReset === currentYear && 
    user.loyaltyDiscountsAvailable && 
    user.loyaltyDiscountsAvailable > 0;
    
  if (hasValidLoyaltyDiscount) {
    // Fetch loyalty discount settings from admin_settings
    const loyaltyAmountSetting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, 'loyalty_discount_amount'),
    });
    const loyaltyDisplayNameSetting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, 'loyalty_discount_display_name'),
    });
    const loyaltyThresholdSetting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, 'loyalty_slots_threshold'),
    });

    const LOYALTY_DISCOUNT_AMOUNT = loyaltyAmountSetting ? parseInt(loyaltyAmountSetting.value) : 15000; // Default $150 in cents
    const LOYALTY_DISPLAY_NAME = loyaltyDisplayNameSetting?.value || 'Appreciation Discount';
    const LOYALTY_THRESHOLD = loyaltyThresholdSetting ? parseInt(loyaltyThresholdSetting.value) : 3;
    
    const discountAmount = LOYALTY_DISCOUNT_AMOUNT;
    const finalPrice = Math.max(0, defaultPrice - discountAmount);

    return {
      totalPrice: finalPrice,
      breakdown: {
        basePrice: defaultPrice,
        discountAmount,
        finalPrice,
      },
      appliedRules: [{
        ruleId: 'loyalty-discount',
        description: `${LOYALTY_DISPLAY_NAME} - Earned by booking ${LOYALTY_THRESHOLD}+ slots at regular price`,
        displayName: LOYALTY_DISPLAY_NAME,
        ruleType: 'discount_amount',
        value: LOYALTY_DISCOUNT_AMOUNT,
      }],
      priceSource: 'user_discount',
    };
  }

  // Step 3: Check for user-specific discount rules
  const userDiscountRules = availableRules.filter(
    r => r.userId === userId && (r.ruleType === 'discount_amount' || r.ruleType === 'discount_percent')
  ).sort((a, b) => b.priority - a.priority);

  if (userDiscountRules.length > 0) {
    const rule = userDiscountRules[0];
    let discountAmount = 0;
    
    if (rule.ruleType === 'discount_amount') {
      // Discount amount is total booking discount, not per-slot
      discountAmount = rule.value;
    } else if (rule.ruleType === 'discount_percent') {
      discountAmount = Math.floor((defaultPrice * rule.value) / 100);
    }

    const finalPrice = Math.max(0, defaultPrice - discountAmount);

    return {
      totalPrice: finalPrice,
      breakdown: {
        basePrice: defaultPrice,
        discountAmount,
        finalPrice,
      },
      appliedRules: [{
        ruleId: rule.id,
        description: rule.description,
        displayName: rule.displayName || undefined,
        ruleType: rule.ruleType as 'fixed_price' | 'discount_amount' | 'discount_percent',
        value: rule.value,
      }],
      priceSource: 'user_discount',
    };
  }

  // Step 4: Check for campaign-wide discount rules
  const campaignDiscountRules = availableRules.filter(
    r => r.campaignId === campaignId && !r.userId && (r.ruleType === 'discount_amount' || r.ruleType === 'discount_percent')
  ).sort((a, b) => b.priority - a.priority);

  if (campaignDiscountRules.length > 0) {
    const rule = campaignDiscountRules[0];
    let discountAmount = 0;
    
    if (rule.ruleType === 'discount_amount') {
      // Discount amount is total booking discount, not per-slot
      discountAmount = rule.value;
    } else if (rule.ruleType === 'discount_percent') {
      discountAmount = Math.floor((defaultPrice * rule.value) / 100);
    }

    const finalPrice = Math.max(0, defaultPrice - discountAmount);

    return {
      totalPrice: finalPrice,
      breakdown: {
        basePrice: defaultPrice,
        discountAmount,
        finalPrice,
      },
      appliedRules: [{
        ruleId: rule.id,
        description: rule.description,
        displayName: rule.displayName || undefined,
        ruleType: rule.ruleType as 'fixed_price' | 'discount_amount' | 'discount_percent',
        value: rule.value,
      }],
      priceSource: 'campaign_discount',
    };
  }

  // Step 6: Check for global discount rules
  const globalDiscountRules = availableRules.filter(
    r => !r.campaignId && !r.userId && (r.ruleType === 'discount_amount' || r.ruleType === 'discount_percent')
  ).sort((a, b) => b.priority - a.priority);

  if (globalDiscountRules.length > 0) {
    const rule = globalDiscountRules[0];
    let discountAmount = 0;
    
    if (rule.ruleType === 'discount_amount') {
      // Discount amount is total booking discount, not per-slot
      discountAmount = rule.value;
    } else if (rule.ruleType === 'discount_percent') {
      discountAmount = Math.floor((defaultPrice * rule.value) / 100);
    }

    const finalPrice = Math.max(0, defaultPrice - discountAmount);

    return {
      totalPrice: finalPrice,
      breakdown: {
        basePrice: defaultPrice,
        discountAmount,
        finalPrice,
      },
      appliedRules: [{
        ruleId: rule.id,
        description: rule.description,
        displayName: rule.displayName || undefined,
        ruleType: rule.ruleType as 'fixed_price' | 'discount_amount' | 'discount_percent',
        value: rule.value,
      }],
      priceSource: 'campaign_discount',
    };
  }

  // Step 7: Fall back to default tiered pricing
  return {
    totalPrice: defaultPrice,
    breakdown: {
      basePrice: defaultPrice,
      discountAmount: 0,
      finalPrice: defaultPrice,
    },
    appliedRules: [],
    priceSource: 'default_tiered',
  };
}

// Record that a pricing rule was applied to a booking
export async function recordPricingRuleApplication(
  pricingRuleId: string,
  bookingId: string,
  userId: string
): Promise<void> {
  await db.insert(pricingRuleApplications).values({
    id: crypto.randomUUID(),
    pricingRuleId,
    bookingId,
    userId,
    appliedAt: new Date(),
  });

  // Increment usage count on the rule
  await db
    .update(pricingRules)
    .set({
      usageCount: sql`${pricingRules.usageCount} + 1`,
    })
    .where(eq(pricingRules.id, pricingRuleId));
}
