import { atom } from 'nanostores';

interface StripeStatusModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  details?: string;
}

const initialState: StripeStatusModalState = {
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  details: undefined,
};

export const stripeStatusModalStore = atom<StripeStatusModalState>(initialState);

export const stripeStatusModalActions = {
  open: (config: Omit<StripeStatusModalState, 'isOpen'>) => {
    stripeStatusModalStore.set({
      ...config,
      isOpen: true,
    });
  },

  close: () => {
    stripeStatusModalStore.set({
      ...stripeStatusModalStore.get(),
      isOpen: false,
    });
  },

  showSuccess: (title: string, message: string, details?: string) => {
    stripeStatusModalActions.open({
      type: 'success',
      title,
      message,
      details,
    });
  },

  showError: (title: string, message: string, details?: string) => {
    stripeStatusModalActions.open({
      type: 'error',
      title,
      message,
      details,
    });
  },

  showInfo: (title: string, message: string, details?: string) => {
    stripeStatusModalActions.open({
      type: 'info',
      title,
      message,
      details,
    });
  },
};
