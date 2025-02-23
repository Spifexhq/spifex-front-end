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
    participants: {
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
  
  export interface ModalFormProps {
    isOpen: boolean;
    onClose: () => void;
  }
  
  type Tab = 'details' | 'costCenters' | 'inventory' | 'participants' | 'recurrence';
  
  export type { Tab };
  