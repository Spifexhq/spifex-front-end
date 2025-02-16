import { useCallback } from "react";
import { format, parse } from 'date-fns';

// Formatting
export const formatAmount = (input) => {
  let numericAmount = input.replace(/\D/g, '');
    if (numericAmount === '') {
      return '';
    }
  let floatAmount = parseFloat(numericAmount) / 100;
  return floatAmount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};


export const unformatAmount = (formattedAmount) => formattedAmount.replace('R$ ', '').replace(/\./g, '').replace(',', '.');


export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};


export const formatDateToDDMMYYYY = (dateString) => {
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
