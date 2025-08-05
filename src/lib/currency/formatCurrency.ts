// src/lib/currency/formatCurrency.ts
/**
 * Converte um valor em centavos (string ou number) para "R$ 1.234,56".
 */
export function formatCurrency(amount: string | number): string {
  const cents = Number(amount) || 0;
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const formatAmount = (input: string) => {
  const numericAmount = input.replace(/\D/g, '');
    if (numericAmount === '') {
      return '';
    }
  const floatAmount = parseFloat(numericAmount) / 100;
  return floatAmount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const unformatAmount = (formattedAmount: string) => {
  return formattedAmount
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');
};