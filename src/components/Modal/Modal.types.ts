// Modal.types.ts

import { Entry } from '@/models/Entries';

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
  
  export interface ModalFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    type: ModalType;
    initialEntry?: Entry | null;
  }
  
  export type Tab = 'details' | 'costCenters' | 'inventory' | 'entities' | 'recurrence';

  export type RecurrenceOption = {
    id: number;
    label: string;
    value: 0 | 1;
  }

  export type PeriodOption = {
    id: number;
    label: string;
    value: 1 | 2 | 3 | 4 | 5;
  };

  export type WeekendOption = {
    id: number;
    label: string;
    value: "postergar" | "antecipar";
  };
