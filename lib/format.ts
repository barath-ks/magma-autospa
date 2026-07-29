export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "₹0.00";
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
