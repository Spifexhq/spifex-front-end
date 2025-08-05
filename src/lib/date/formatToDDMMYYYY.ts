// src/lib/date/formatDateToDDMMYYYY.ts
import { format, parse } from 'date-fns';

export const formatDateToDDMMYYYY = (dateString: string) => {
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return format(date, 'dd/MM/yyyy');
};
