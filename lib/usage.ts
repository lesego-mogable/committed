export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number };

function inputPricePer1M(): number {
  return Number(process.env.AZURE_OPENAI_INPUT_PRICE_PER_1M_USD ?? 0);
}

function outputPricePer1M(): number {
  return Number(process.env.AZURE_OPENAI_OUTPUT_PRICE_PER_1M_USD ?? 0);
}

function usdToZarRate(): number {
  return Number(process.env.USD_TO_ZAR_RATE ?? 18.5);
}

export function estimateCostUsd(usage: TokenUsage): number {
  return (
    (usage.promptTokens / 1_000_000) * inputPricePer1M() +
    (usage.completionTokens / 1_000_000) * outputPricePer1M()
  );
}

export function usdToZar(usd: number): number {
  return usd * usdToZarRate();
}
