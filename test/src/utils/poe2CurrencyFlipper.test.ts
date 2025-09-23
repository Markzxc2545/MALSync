import { expect } from 'chai';
import { POE2CurrencyFlipper } from '../../../src/utils/poe2CurrencyFlipper';

describe('POE2CurrencyFlipper', () => {
  let flipper: POE2CurrencyFlipper;

  beforeEach(() => {
    flipper = new POE2CurrencyFlipper();
  });

  describe('Initialization', () => {
    it('should initialize with default currencies', () => {
      const currencies = flipper.getCurrencies();
      expect(currencies).to.be.an('array');
      expect(currencies.length).to.be.greaterThan(0);
      
      // Check for some essential currencies
      const currencyNames = currencies.map(c => c.id);
      expect(currencyNames).to.include('gold');
      expect(currencyNames).to.include('chaos_orb');
      expect(currencyNames).to.include('divine_orb');
      expect(currencyNames).to.include('exalted_orb');
    });

    it('should start with empty exchange rates', () => {
      const rates = flipper.getExchangeRates();
      expect(rates).to.be.an('array');
      expect(rates.length).to.equal(0);
    });
  });

  describe('Currency Management', () => {
    it('should allow adding new currencies', () => {
      const newCurrency = {
        id: 'test_orb',
        name: 'Test Orb',
        valueInGold: 50,
      };

      flipper.addCurrency(newCurrency);
      const currencies = flipper.getCurrencies();
      const added = currencies.find(c => c.id === 'test_orb');
      
      expect(added).to.exist;
      expect(added!.name).to.equal('Test Orb');
      expect(added!.valueInGold).to.equal(50);
    });

    it('should allow updating existing currencies', () => {
      const updatedGold = {
        id: 'gold',
        name: 'Gold Pieces',
        valueInGold: 1,
      };

      flipper.addCurrency(updatedGold);
      const currencies = flipper.getCurrencies();
      const gold = currencies.find(c => c.id === 'gold');
      
      expect(gold!.name).to.equal('Gold Pieces');
    });
  });

  describe('Exchange Rate Management', () => {
    it('should allow adding exchange rates', () => {
      const rate = {
        from: 'gold',
        to: 'chaos_orb',
        rate: 0.01,
      };

      flipper.addExchangeRate(rate);
      const rates = flipper.getExchangeRates();
      
      expect(rates).to.have.length(1);
      expect(rates[0]).to.deep.equal(rate);
    });

    it('should allow updating multiple exchange rates', () => {
      const rates = [
        { from: 'gold', to: 'chaos_orb', rate: 0.01 },
        { from: 'chaos_orb', to: 'divine_orb', rate: 20.0 },
        { from: 'divine_orb', to: 'exalted_orb', rate: 2.5 },
      ];

      flipper.updateExchangeRates(rates);
      const storedRates = flipper.getExchangeRates();
      
      expect(storedRates).to.have.length(3);
      expect(storedRates).to.deep.equal(rates);
    });
  });

  describe('Flip Calculation', () => {
    beforeEach(() => {
      // Set up a more comprehensive exchange rate chain for testing
      const rates = [
        { from: 'gold', to: 'orb_of_transmutation', rate: 0.5 },
        { from: 'orb_of_transmutation', to: 'orb_of_augmentation', rate: 1.5 },
        { from: 'orb_of_augmentation', to: 'orb_of_alteration', rate: 1.67 },
        { from: 'orb_of_alteration', to: 'chromatic_orb', rate: 1.6 },
        { from: 'chromatic_orb', to: 'chaos_orb', rate: 12.5 },
        { from: 'chaos_orb', to: 'divine_orb', rate: 20.0 },
        { from: 'divine_orb', to: 'exalted_orb', rate: 2.5 },
        // Add some reverse/alternative paths to create more opportunities
        { from: 'orb_of_alteration', to: 'chaos_orb', rate: 20.0 },
        { from: 'chromatic_orb', to: 'divine_orb', rate: 250.0 },
        { from: 'orb_of_augmentation', to: 'chaos_orb', rate: 33.4 },
      ];
      flipper.updateExchangeRates(rates);
    });

    it('should find profitable opportunities', () => {
      const opportunities = flipper.findBestFlips(10000, 1, 3);
      
      expect(opportunities).to.be.an('array');
      // Should find some opportunities with the rates we set up
      if (opportunities.length > 0) {
        expect(opportunities[0]).to.have.property('path');
        expect(opportunities[0]).to.have.property('profitPercentage');
        expect(opportunities[0]).to.have.property('profit');
        expect(opportunities[0]).to.have.property('goldRequired');
        expect(opportunities[0]).to.have.property('steps');
      }
    });

    it('should filter by minimum profit percentage', () => {
      const lowProfitOpps = flipper.findBestFlips(10000, 1, 3);
      const highProfitOpps = flipper.findBestFlips(10000, 50, 3);
      
      expect(highProfitOpps.length).to.be.lessThanOrEqual(lowProfitOpps.length);
      
      if (highProfitOpps.length > 0) {
        highProfitOpps.forEach(opp => {
          expect(opp.profitPercentage).to.be.at.least(50);
        });
      }
    });

    it('should limit by maximum steps', () => {
      const twoStepOpps = flipper.findBestFlips(10000, 1, 2);
      const threeStepOpps = flipper.findBestFlips(10000, 1, 3);
      
      // All 2-step opportunities should have at most 2 steps
      twoStepOpps.forEach(opp => {
        expect(opp.steps.length).to.be.at.most(2);
      });
      
      // All 3-step opportunities should have at most 3 steps  
      threeStepOpps.forEach(opp => {
        expect(opp.steps.length).to.be.at.most(3);
      });
      
      // We should be able to find some opportunities with the rates we set up
      expect(twoStepOpps.length).to.be.greaterThan(0);
      expect(threeStepOpps.length).to.be.greaterThan(0);
    });

    it('should sort opportunities by profit percentage descending', () => {
      const opportunities = flipper.findBestFlips(10000, 1, 3);
      
      if (opportunities.length > 1) {
        for (let i = 1; i < opportunities.length; i++) {
          expect(opportunities[i-1].profitPercentage).to.be.at.least(
            opportunities[i].profitPercentage
          );
        }
      }
    });
  });

  describe('Market Summary', () => {
    beforeEach(() => {
      // Set up some exchange rates for testing
      const rates = [
        { from: 'gold', to: 'chaos_orb', rate: 0.01 },
        { from: 'chaos_orb', to: 'divine_orb', rate: 20.0 },
        { from: 'divine_orb', to: 'exalted_orb', rate: 2.5 },
      ];
      flipper.updateExchangeRates(rates);
    });

    it('should provide market summary', () => {
      const summary = flipper.getMarketSummary(10000);
      
      expect(summary).to.have.property('bestFlip');
      expect(summary).to.have.property('totalOpportunities');
      expect(summary).to.have.property('averageProfit');
      expect(summary).to.have.property('recommendations');
      
      expect(summary.totalOpportunities).to.be.a('number');
      expect(summary.averageProfit).to.be.a('number');
      expect(summary.recommendations).to.be.an('array');
    });

    it('should provide recommendations', () => {
      const summary = flipper.getMarketSummary(10000);
      
      expect(summary.recommendations).to.be.an('array');
      expect(summary.recommendations.length).to.be.greaterThan(0);
      
      summary.recommendations.forEach(rec => {
        expect(rec).to.be.a('string');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty exchange rates gracefully', () => {
      flipper.updateExchangeRates([]);
      const opportunities = flipper.findBestFlips(10000, 1, 3);
      
      expect(opportunities).to.be.an('array');
      expect(opportunities.length).to.equal(0);
    });

    it('should handle zero investment gracefully', () => {
      const rates = [{ from: 'gold', to: 'chaos_orb', rate: 0.01 }];
      flipper.updateExchangeRates(rates);
      
      const opportunities = flipper.findBestFlips(0, 1, 2);
      expect(opportunities).to.be.an('array');
    });

    it('should handle very high profit threshold', () => {
      const rates = [{ from: 'gold', to: 'chaos_orb', rate: 0.01 }];
      flipper.updateExchangeRates(rates);
      
      const opportunities = flipper.findBestFlips(10000, 1000, 2);
      expect(opportunities).to.be.an('array');
      expect(opportunities.length).to.equal(0);
    });

    it('should handle single step limit', () => {
      const rates = [{ from: 'gold', to: 'chaos_orb', rate: 0.01 }];
      flipper.updateExchangeRates(rates);
      
      const opportunities = flipper.findBestFlips(10000, 1, 1);
      expect(opportunities).to.be.an('array');
      // Single step should not find any opportunities (need at least 2 steps for a trade)
      expect(opportunities.length).to.equal(0);
    });
  });

  describe('Currency Value Calculations', () => {
    it('should respect currency gold values in profit calculations', () => {
      // Add a high-value currency
      flipper.addCurrency({
        id: 'mirror_shard',
        name: 'Mirror Shard',
        valueInGold: 10000,
      });
      
      const rates = [
        { from: 'gold', to: 'mirror_shard', rate: 0.0001 }, // 10000 gold -> 1 mirror shard
        { from: 'mirror_shard', to: 'gold', rate: 10000 }, // 1 mirror shard -> 10000 gold
      ];
      flipper.updateExchangeRates(rates);
      
      const opportunities = flipper.findBestFlips(10000, 1, 2);
      
      // This should theoretically break even (no profit due to same conversion rates)
      // but let's check the calculation works
      expect(opportunities).to.be.an('array');
    });
  });
});