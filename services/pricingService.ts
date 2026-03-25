import { UsageMetadata } from '../types';

// Pricing in USD per 1M tokens (as of March 2024 / current AI Studio rates)
export const PRICING = {
  GEMINI_FLASH: {
    INPUT: 0.075 / 1000000,
    OUTPUT: 0.30 / 1000000
  },
  GEMINI_FLASH_LITE: {
    INPUT: 0.0375 / 1000000,
    OUTPUT: 0.15 / 1000000
  },
  GEMINI_PRO: {
    INPUT: 1.25 / 1000000,
    OUTPUT: 5.00 / 1000000
  },
  TOGETHER_AI_IMAGE: 0.03 // per image
};

export const calculateGeminiCost = (modelName: string, usage?: UsageMetadata): number => {
  if (!usage) return 0;
  
  let rate = PRICING.GEMINI_FLASH; // Default
  
  if (modelName.includes('flash-lite')) {
    rate = PRICING.GEMINI_FLASH_LITE;
  } else if (modelName.includes('pro')) {
    rate = PRICING.GEMINI_PRO;
  } else if (modelName.includes('flash')) {
    rate = PRICING.GEMINI_FLASH;
  }

  const inputCost = usage.promptTokenCount * rate.INPUT;
  const outputCost = usage.candidatesTokenCount * rate.OUTPUT;
  
  return inputCost + outputCost;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(amount);
};
