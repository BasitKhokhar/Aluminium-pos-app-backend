const { convertToCm, calculateAreaCm2, getAreaConversionFactor } = require('./utils/unitConverter');

function simulatePriceAdjustment(purchasePrice, unit) {
    const areaFactor = getAreaConversionFactor(unit);
    if (areaFactor > 1) {
        return purchasePrice / areaFactor;
    }
    return purchasePrice;
}

console.log("--- Unit Conversion Factors ---");
console.log("cm factor:", getAreaConversionFactor('cm')); // Should be 1
console.log("meter factor:", getAreaConversionFactor('meter')); // Should be 10000 (100*100)
console.log("feet factor:", getAreaConversionFactor('feet')); // Should be ~929.03 (30.48 * 30.48)
console.log("inch factor:", getAreaConversionFactor('inch')); // Should be 6.4516 (2.54 * 2.54)

console.log("\n--- Price Normalization (Target: $100 per unit) ---");

// Meter: 1m x 1m = 10000 cm2. Price $100 per meter^2 -> $0.01 per cm2
const meterPrice = 100;
const normMeterPrice = simulatePriceAdjustment(meterPrice, 'meter');
console.log(`Meter: Input $${meterPrice}/m2 -> Adjusted $${normMeterPrice}/cm2`);
console.log(`Back-check: 10000 cm2 * $${normMeterPrice} = $${10000 * normMeterPrice}`);

// Feet: 1ft x 1ft = 929.03 cm2. Price $100 per feet^2 -> $0.1076... per cm2
const feetPrice = 100;
const normFeetPrice = simulatePriceAdjustment(feetPrice, 'feet');
console.log(`Feet: Input $${feetPrice}/ft2 -> Adjusted $${normFeetPrice}/cm2`);
console.log(`Back-check: 929.0304 cm2 * $${normFeetPrice} = $${929.0304 * normFeetPrice}`);

// CM: 1cm x 1cm = 1 cm2. Price $100 per cm2 -> $100 per cm2
const cmPrice = 100;
const normCmPrice = simulatePriceAdjustment(cmPrice, 'cm');
console.log(`CM: Input $${cmPrice}/cm2 -> Adjusted $${normCmPrice}/cm2`);
