// src/components/Modal/Modal.types.ts
import { Entry } from '@/models/entries/domain';

export interface FormData {
    details: {
      dueDate: string;
      description: string;
      observation: string;
      amount: string;
      accountingAccount: string;
      documentType: string;
      notes: string;
    };
    costCenters: {
      departments: string[];
      department_percentage: string[];
      projects: string;
    };
    inventory: {
      product: string;
      quantity: string;
    };
    entities: {
      entityType: string;
      entity: string;
    };
    recurrence: {
      recurrence: number;
      installments: string;
      periods: number;
      weekend: string;
    };
  }

  export type ModalType = 'credit' | 'debit';
  
  export interface EntriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    type: ModalType;
    initialEntry?: Entry | null;
    isLoadingEntry?: boolean;
  }
  
  export type Tab = 'details' | 'costCenters' | 'inventory' | 'entities' | 'recurrence';

  export type RecurrenceOption = {
    id: number;
    label: string;
    value: 0 | 1;
  }

  export type IntervalMonths = 0 | 1 | 2 | 3 | 6 | 12;

  export type PeriodOption = {
    id: IntervalMonths;
    label: string;
    value: IntervalMonths;
  };

  export type WeekendOption = {
    id: number;
    label: string;
    value: "postpone" | "antedate";
  };
