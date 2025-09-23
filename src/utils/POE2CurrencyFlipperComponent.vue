<template>
  <div class="poe2-currency-flipper">
    <div class="flipper-header">
      <h3>POE2 Currency Flipper Calculator</h3>
      <p>Find the most profitable currency exchange paths while minimizing gold investment</p>
    </div>

    <div class="flipper-controls">
      <div class="control-group">
        <label for="max-investment">Max Gold Investment:</label>
        <input
          id="max-investment"
          v-model.number="maxInvestment"
          type="number"
          min="100"
          max="1000000"
          step="100"
          @input="updateCalculations"
        />
      </div>

      <div class="control-group">
        <label for="min-profit">Min Profit %:</label>
        <input
          id="min-profit"
          v-model.number="minProfitPercentage"
          type="number"
          min="1"
          max="100"
          step="0.5"
          @input="updateCalculations"
        />
      </div>

      <div class="control-group">
        <label for="max-steps">Max Steps:</label>
        <select id="max-steps" v-model.number="maxSteps" @change="updateCalculations">
          <option value="2">2 Steps</option>
          <option value="3">3 Steps</option>
          <option value="4">4 Steps</option>
        </select>
      </div>

      <button @click="refreshRates" class="refresh-btn" :disabled="loading">
        {{ loading ? 'Calculating...' : 'Recalculate' }}
      </button>
    </div>

    <div class="exchange-rates-section">
      <h4>Exchange Rates</h4>
      <div class="rates-grid">
        <div v-for="(rate, index) in exchangeRates" :key="index" class="rate-item">
          <select v-model="rate.from" @change="updateCalculations">
            <option v-for="currency in currencies" :key="currency.id" :value="currency.id">
              {{ currency.name }}
            </option>
          </select>
          <span class="arrow">→</span>
          <select v-model="rate.to" @change="updateCalculations">
            <option v-for="currency in currencies" :key="currency.id" :value="currency.id">
              {{ currency.name }}
            </option>
          </select>
          <input
            v-model.number="rate.rate"
            type="number"
            min="0.001"
            step="0.001"
            placeholder="Rate"
            @input="updateCalculations"
          />
          <button @click="removeRate(index)" class="remove-btn">×</button>
        </div>
      </div>
      <button @click="addRate" class="add-rate-btn">+ Add Exchange Rate</button>
    </div>

    <div class="market-summary" v-if="marketSummary">
      <h4>Market Summary</h4>
      <div class="summary-stats">
        <div class="stat">
          <span class="label">Total Opportunities:</span>
          <span class="value">{{ marketSummary.totalOpportunities }}</span>
        </div>
        <div class="stat">
          <span class="label">Average Profit:</span>
          <span class="value">{{ marketSummary.averageProfit.toFixed(2) }}%</span>
        </div>
      </div>
      <div class="recommendations">
        <h5>Recommendations:</h5>
        <ul>
          <li v-for="rec in marketSummary.recommendations" :key="rec">{{ rec }}</li>
        </ul>
      </div>
    </div>

    <div class="opportunities-list">
      <h4>Best Flip Opportunities</h4>
      <div v-if="opportunities.length === 0" class="no-opportunities">
        No profitable opportunities found. Try adjusting your parameters or exchange rates.
      </div>
      <div v-else class="opportunities-grid">
        <div
          v-for="(opportunity, index) in opportunities.slice(0, 10)"
          :key="index"
          class="opportunity-card"
        >
          <div class="opportunity-header">
            <div class="path">
              <span
                v-for="(currencyId, pathIndex) in opportunity.path"
                :key="pathIndex"
                class="currency-step"
              >
                {{ getCurrencyName(currencyId) }}
                <span v-if="pathIndex < opportunity.path.length - 1" class="path-arrow">→</span>
              </span>
            </div>
            <div class="profit-badge" :class="getProfitClass(opportunity.profitPercentage)">
              +{{ opportunity.profitPercentage.toFixed(2) }}%
            </div>
          </div>

          <div class="opportunity-details">
            <div class="detail-row">
              <span class="label">Investment:</span>
              <span class="value">{{ formatGold(opportunity.goldRequired) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Profit:</span>
              <span class="value profit">+{{ formatGold(opportunity.profit) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Steps:</span>
              <span class="value">{{ opportunity.steps.length }}</span>
            </div>
          </div>

          <div class="steps-breakdown">
            <h6>Exchange Steps:</h6>
            <div
              v-for="(step, stepIndex) in opportunity.steps"
              :key="stepIndex"
              class="step-detail"
            >
              {{ formatNumber(step.fromAmount) }} {{ getCurrencyName(step.from) }}
              →
              {{ formatNumber(step.toAmount) }} {{ getCurrencyName(step.to) }}
              <span class="rate">({{ step.rate.toFixed(3) }}:1)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  POE2CurrencyFlipper,
  type FlipOpportunity,
  type ExchangeRate,
  type CurrencyType,
} from './poe2CurrencyFlipper';

const flipper = new POE2CurrencyFlipper();

// Reactive data
const maxInvestment = ref(10000);
const minProfitPercentage = ref(5);
const maxSteps = ref(3);
const loading = ref(false);
const opportunities = ref<FlipOpportunity[]>([]);
const exchangeRates = ref<ExchangeRate[]>([]);
const currencies = ref<CurrencyType[]>([]);
const marketSummary = ref<any>(null);

// Initialize default exchange rates
const initializeDefaultRates = () => {
  const defaultRates: ExchangeRate[] = [
    { from: 'gold', to: 'orb_of_transmutation', rate: 0.5 },
    { from: 'orb_of_transmutation', to: 'orb_of_augmentation', rate: 1.5 },
    { from: 'orb_of_augmentation', to: 'orb_of_alteration', rate: 1.67 },
    { from: 'orb_of_alteration', to: 'chromatic_orb', rate: 1.6 },
    { from: 'chromatic_orb', to: 'jewellers_orb', rate: 1.5 },
    { from: 'jewellers_orb', to: 'orb_of_fusing', rate: 1.67 },
    { from: 'orb_of_fusing', to: 'chaos_orb', rate: 5.0 },
    { from: 'chaos_orb', to: 'regal_orb', rate: 2.0 },
    { from: 'chaos_orb', to: 'divine_orb', rate: 20.0 },
    { from: 'divine_orb', to: 'exalted_orb', rate: 2.5 },
    // Add some reverse rates for more trading opportunities
    { from: 'orb_of_fusing', to: 'jewellers_orb', rate: 0.6 },
    { from: 'chaos_orb', to: 'orb_of_fusing', rate: 0.2 },
    { from: 'regal_orb', to: 'chaos_orb', rate: 0.5 },
  ];

  exchangeRates.value = defaultRates;
  flipper.updateExchangeRates(defaultRates);
};

const updateCalculations = async () => {
  loading.value = true;

  // Small delay to show loading state
  await new Promise(resolve => {
    setTimeout(resolve, 100);
  });

  try {
    flipper.updateExchangeRates(exchangeRates.value);
    opportunities.value = flipper.findBestFlips(
      maxInvestment.value,
      minProfitPercentage.value,
      maxSteps.value,
    );
    marketSummary.value = flipper.getMarketSummary(maxInvestment.value);
  } catch (error) {
    console.error('Error calculating opportunities:', error);
  } finally {
    loading.value = false;
  }
};

const addRate = () => {
  exchangeRates.value.push({
    from: 'gold',
    to: 'orb_of_transmutation',
    rate: 1.0,
  });
};

const removeRate = (index: number) => {
  exchangeRates.value.splice(index, 1);
  updateCalculations();
};

const refreshRates = () => {
  updateCalculations();
};

const getCurrencyName = (currencyId: string): string => {
  const currency = currencies.value.find(c => c.id === currencyId);
  return currency ? currency.name : currencyId;
};

const getProfitClass = (profitPercentage: number): string => {
  if (profitPercentage >= 20) return 'excellent';
  if (profitPercentage >= 10) return 'good';
  if (profitPercentage >= 5) return 'fair';
  return 'poor';
};

const formatGold = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return Math.round(amount).toString();
};

const formatNumber = (amount: number): string => {
  return amount.toFixed(2);
};

onMounted(() => {
  currencies.value = flipper.getCurrencies();
  initializeDefaultRates();
  updateCalculations();
});
</script>

<style scoped>
.poe2-currency-flipper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.flipper-header {
  text-align: center;
  margin-bottom: 30px;
}

.flipper-header h3 {
  color: #d4af37;
  margin-bottom: 10px;
  font-size: 1.8em;
}

.flipper-header p {
  color: #888;
  font-size: 1.1em;
}

.flipper-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
}

.control-group input,
.control-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.exchange-rates-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.exchange-rates-section h4 {
  margin-bottom: 15px;
  color: #333;
}

.rates-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.rate-item {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.rate-item select,
.rate-item input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.arrow {
  font-weight: bold;
  color: #666;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-weight: bold;
}

.add-rate-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.market-summary {
  margin-bottom: 30px;
  padding: 20px;
  background: #e3f2fd;
  border-radius: 8px;
}

.summary-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat .label {
  font-size: 0.9em;
  color: #666;
}

.stat .value {
  font-weight: bold;
  font-size: 1.1em;
  color: #333;
}

.recommendations h5 {
  margin-bottom: 10px;
  color: #333;
}

.recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.opportunities-list h4 {
  margin-bottom: 20px;
  color: #333;
}

.no-opportunities {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.opportunity-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.opportunity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.path {
  font-weight: 600;
  color: #333;
}

.currency-step {
  white-space: nowrap;
}

.path-arrow {
  margin: 0 5px;
  color: #666;
}

.profit-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9em;
}

.profit-badge.excellent {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.profit-badge.good {
  background: #cce5ff;
  color: #004085;
  border: 1px solid #b8daff;
}

.profit-badge.fair {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.profit-badge.poor {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.opportunity-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.detail-row .label {
  color: #666;
  font-size: 0.9em;
}

.detail-row .value {
  font-weight: 600;
}

.detail-row .value.profit {
  color: #28a745;
}

.steps-breakdown h6 {
  margin-bottom: 10px;
  color: #333;
  font-size: 0.9em;
}

.step-detail {
  font-size: 0.85em;
  color: #666;
  margin-bottom: 5px;
}

.step-detail .rate {
  color: #999;
  font-style: italic;
}

@media (max-width: 768px) {
  .flipper-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-stats {
    flex-direction: column;
    gap: 15px;
  }

  .opportunities-grid {
    grid-template-columns: 1fr;
  }

  .rate-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
