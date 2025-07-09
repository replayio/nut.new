import { atom } from 'nanostores';

export interface FeedbackModalState {
  isOpen: boolean;
  formData: {
    description: string;
    email: string;
    share: boolean;
  };
  submitted: boolean;
}

export const feedbackModalState = atom<FeedbackModalState>({
  isOpen: false,
  formData: {
    description: '',
    email: '',
    share: false,
  },
  submitted: false,
});

export const feedbackModalStore = {
  open: () => {
    feedbackModalState.set({
      isOpen: true,
      formData: {
        description: '',
        email: '',
        share: false,
      },
      submitted: false,
    });
  },
  close: () => {
    feedbackModalState.set({
      ...feedbackModalState.get(),
      isOpen: false,
    });
  },
  setFormData: (formData: FeedbackModalState['formData']) => {
    feedbackModalState.set({
      ...feedbackModalState.get(),
      formData,
    });
  },
  setSubmitted: (submitted: boolean) => {
    feedbackModalState.set({
      ...feedbackModalState.get(),
      submitted,
    });
  },
};
