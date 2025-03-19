// Modal.types.ts

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
      recurrence: string;
      installments: string;
      periods: string;
      weekend: string;
    };
  }

  export type ModalType = 'credit' | 'debit';
  
  export interface ModalFormProps {
    isOpen: boolean;
    onClose: () => void;
    type: ModalType;
  }
  
  type Tab = 'details' | 'costCenters' | 'inventory' | 'entities' | 'recurrence';
  
  export type { Tab };
  