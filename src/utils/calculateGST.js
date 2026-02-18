export const calculateGST = (amount, gstRate) => {
  const gstAmount = (amount * gstRate) / 100;
  const total = amount + gstAmount;
  return {
    base: parseFloat(amount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

export const numberToWords = (price) => {
  // Simple placeholder. In a real app, use a library like 'number-to-words'
  return `Rupees ${price} Only`;
};
