/**
 * POE2 Currency Flipper Calculator
 * Calculates optimal currency exchange paths to maximize profit while minimizing gold usage
 */

export interface CurrencyType {
  id: string;
  name: string;
  icon?: string;
  valueInGold: number; // Base value in gold for reference
}

export interface ExchangeRate {
  from: string; // Currency ID
  to: string; // Currency ID
  rate: number; // How much 'to' currency you get for 1 'from' currency
  fee?: number; // Optional transaction fee
}

export interface FlipOpportunity {
  path: string[]; // Array of currency IDs showing the exchange path
  startAmount: number;
  endAmount: number;
  profit: number;
  profitPercentage: number;
  goldRequired: number;
  steps: Array<{
    from: string;
    to: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
  }>;
}

export class POE2CurrencyFlipper {
  private currencies: Map<string, CurrencyType> = new Map();

  private exchangeRates: ExchangeRate[] = [];

  constructor() {
    this.initializeDefaultCurrencies();
  }

  /**
   * Initialize default POE2 currencies
   */
  private initializeDefaultCurrencies(): void {
    const defaultCurrencies: CurrencyType[] = [
      { id: 'gold', name: 'Gold', valueInGold: 1 },
      { id: 'orb_of_transmutation', name: 'Orb of Transmutation', valueInGold: 2 },
      { id: 'orb_of_augmentation', name: 'Orb of Augmentation', valueInGold: 3 },
      { id: 'orb_of_alteration', name: 'Orb of Alteration', valueInGold: 5 },
      { id: 'chromatic_orb', name: 'Chromatic Orb', valueInGold: 8 },
      { id: 'jewellers_orb', name: "Jeweller's Orb", valueInGold: 12 },
      { id: 'orb_of_fusing', name: 'Orb of Fusing', valueInGold: 20 },
      { id: 'orb_of_alchemy', name: 'Orb of Alchemy', valueInGold: 15 },
      { id: 'chaos_orb', name: 'Chaos Orb', valueInGold: 100 },
      { id: 'regal_orb', name: 'Regal Orb', valueInGold: 200 },
      { id: 'gemcutter_prism', name: "Gemcutter's Prism", valueInGold: 150 },
      { id: 'cartographer_chisel', name: "Cartographer's Chisel", valueInGold: 80 },
      { id: 'orb_of_scouring', name: 'Orb of Scouring', valueInGold: 60 },
      { id: 'blessed_orb', name: 'Blessed Orb', valueInGold: 300 },
      { id: 'divine_orb', name: 'Divine Orb', valueInGold: 2000 },
      { id: 'exalted_orb', name: 'Exalted Orb', valueInGold: 5000 },
      { id: 'mirror_of_kalandra', name: 'Mirror of Kalandra', valueInGold: 50000 },
    ];

    defaultCurrencies.forEach(currency => {
      this.currencies.set(currency.id, currency);
    });
  }

  /**
   * Add or update a currency
   */
  addCurrency(currency: CurrencyType): void {
    this.currencies.set(currency.id, currency);
  }

  /**
   * Add exchange rate
   */
  addExchangeRate(rate: ExchangeRate): void {
    this.exchangeRates.push(rate);
  }

  /**
   * Update multiple exchange rates
   */
  updateExchangeRates(rates: ExchangeRate[]): void {
    this.exchangeRates = rates;
  }

  /**
   * Get all currencies
   */
  getCurrencies(): CurrencyType[] {
    return Array.from(this.currencies.values());
  }

  /**
   * Get current exchange rates
   */
  getExchangeRates(): ExchangeRate[] {
    return this.exchangeRates;
  }

  /**
   * Find the best flip opportunities
   */
  findBestFlips(
    maxGoldInvestment: number = 10000,
    minProfitPercentage: number = 5,
    maxSteps: number = 3,
  ): FlipOpportunity[] {
    const opportunities: FlipOpportunity[] = [];

    // Generate all possible paths up to maxSteps
    const allPaths = this.generatePaths(maxSteps);

    allPaths.forEach(path => {
      const opportunity = this.calculatePathProfit(path, maxGoldInvestment);
      if (opportunity && opportunity.profitPercentage >= minProfitPercentage) {
        opportunities.push(opportunity);
      }
    });

    // Sort by profit percentage descending
    return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
  }

  /**
   * Calculate profit for a specific exchange path
   */
  private calculatePathProfit(path: string[], maxGoldInvestment: number): FlipOpportunity | null {
    if (path.length < 2) return null;

    const steps: FlipOpportunity['steps'] = [];
    let currentAmount = maxGoldInvestment;
    let goldRequired = 0;

    // Calculate each step in the path
    const calculationResult = path.slice(0, -1).reduce<{
      amount: number;
      steps: FlipOpportunity['steps'];
      failed: boolean;
    }>(
      (acc, fromCurrency, i) => {
        if (acc.failed) return acc;

        const toCurrency = path[i + 1];
        const rate = this.getExchangeRate(fromCurrency, toCurrency);
        if (!rate) {
          acc.failed = true;
          return acc;
        }

        const fromAmount = acc.amount;
        const toAmount = fromAmount * rate.rate;
        const fee = rate.fee || 0;
        const finalAmount = toAmount - fee;

        if (finalAmount <= 0) {
          acc.failed = true;
          return acc;
        }

        acc.steps.push({
          from: fromCurrency,
          to: toCurrency,
          fromAmount,
          toAmount: finalAmount,
          rate: rate.rate,
        });

        acc.amount = finalAmount;
        return acc;
      },
      { amount: currentAmount, steps: [], failed: false },
    );

    if (calculationResult.failed) return null;

    currentAmount = calculationResult.amount;
    steps.push(...calculationResult.steps);

    // Calculate gold requirement
    const startCurrency = this.currencies.get(path[0]);
    const endCurrency = this.currencies.get(path[path.length - 1]);

    if (!startCurrency || !endCurrency) return null;

    goldRequired = maxGoldInvestment;
    const finalGoldValue = currentAmount * endCurrency.valueInGold;
    const profit = finalGoldValue - goldRequired;
    const profitPercentage = (profit / goldRequired) * 100;

    return {
      path,
      startAmount: maxGoldInvestment,
      endAmount: currentAmount,
      profit,
      profitPercentage,
      goldRequired,
      steps,
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  private getExchangeRate(from: string, to: string): ExchangeRate | null {
    return this.exchangeRates.find(rate => rate.from === from && rate.to === to) || null;
  }

  /**
   * Generate all possible paths up to maxSteps
   */
  private generatePaths(maxSteps: number): string[][] {
    const paths: string[][] = [];
    const currencyIds = Array.from(this.currencies.keys());

    const generatePath = (currentPath: string[], remainingSteps: number) => {
      if (remainingSteps === 0 && currentPath.length >= 2) {
        paths.push([...currentPath]);
        return;
      }

      if (remainingSteps === 0) return;

      const lastCurrency = currentPath[currentPath.length - 1];

      // Find all possible next currencies
      currencyIds
        .filter(currencyId => !currentPath.includes(currencyId))
        .filter(currencyId => this.getExchangeRate(lastCurrency, currencyId))
        .forEach(currencyId => {
          currentPath.push(currencyId);
          generatePath(currentPath, remainingSteps - 1);
          currentPath.pop();
        });
    };

    // Start from each currency
    currencyIds.forEach(startCurrency => {
      generatePath([startCurrency], maxSteps);
    });

    return paths;
  }

  /**
   * Calculate optimal investment amount for a specific flip
   */
  calculateOptimalInvestment(opportunity: FlipOpportunity, maxBudget: number): number {
    // Simple optimization: use the maximum budget if profitable
    // Could be enhanced with more sophisticated algorithms
    return Math.min(maxBudget, opportunity.goldRequired);
  }

  /**
   * Get market summary with current best opportunities
   */
  getMarketSummary(maxGoldInvestment: number = 10000): {
    bestFlip: FlipOpportunity | null;
    totalOpportunities: number;
    averageProfit: number;
    recommendations: string[];
  } {
    const opportunities = this.findBestFlips(maxGoldInvestment, 1, 3);

    const bestFlip = opportunities.length > 0 ? opportunities[0] : null;
    const totalOpportunities = opportunities.length;
    const averageProfit =
      opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + opp.profitPercentage, 0) / opportunities.length
        : 0;

    const recommendations: string[] = [];

    if (bestFlip) {
      recommendations.push(
        `Best flip: ${bestFlip.path.join(' → ')} (+${bestFlip.profitPercentage.toFixed(1)}%)`,
      );
    }

    if (totalOpportunities === 0) {
      recommendations.push('No profitable opportunities found with current rates');
    } else if (totalOpportunities < 5) {
      recommendations.push('Limited opportunities - consider updating exchange rates');
    }

    return {
      bestFlip,
      totalOpportunities,
      averageProfit,
      recommendations,
    };
  }
}
