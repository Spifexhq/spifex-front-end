import { useCallback } from "react";
import { format, parse } from 'date-fns';

// Formatting
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


export const decimalToCentsString = (amount: string | number) => {
  const num = Number(amount);
  return Number.isFinite(num) ? Math.round(num * 100).toString() : "";
};


export const centsToDecimalString = (cents: string) => {
  if (!cents) return "";
  const value = (parseInt(cents, 10) || 0) / 100;
  // toFixed(2) garante duas casas decimais
  return value.toFixed(2);
};


export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};


export const formatDateToDDMMYYYY = (dateString: string) => {
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return format(date, 'dd/MM/yyyy');
};


export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Generate Random ClassNames
export const generateRandomClassName = (baseClass: string = '') => {
  const randomId = Math.random().toString(36).slice(2, 11);
  
  return baseClass ? `${baseClass}-${randomId}` : randomId;
};

const useFormatCurrency = () => {
  const formatCurrency = useCallback((amount: string): string => {
    const numeric = parseInt(amount, 10) || 0;
    const formatted = (numeric / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `R$ ${formatted}`;
  }, []);

  return { formatCurrency };
};

export default useFormatCurrency;
