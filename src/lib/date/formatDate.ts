// src/lib/date/formatDate.ts
export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};
