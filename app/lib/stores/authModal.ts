import { atom } from 'nanostores';

export type AuthModalState = 'form' | 'success' | 'error' | 'reset';

export const authModalStore = {
  isOpen: atom<boolean>(false),
  isSignUp: atom<boolean>(false),
  state: atom<AuthModalState>('form'),
  message: atom<string>(''),
  showPasswordReset: atom<boolean>(false),

  open(signUp: boolean = false) {
    this.isSignUp.set(signUp);
    this.state.set('form');
    this.message.set('');
    this.showPasswordReset.set(false);
    this.isOpen.set(true);
  },

  close() {
    this.isOpen.set(false);
    this.state.set('form');
    this.message.set('');
    this.showPasswordReset.set(false);
  },

  setState(state: AuthModalState, message: string = '') {
    this.state.set(state);
    this.message.set(message);
  },

  toggleForm() {
    this.isSignUp.set(!this.isSignUp.get());
    this.state.set('form');
    this.message.set('');
    this.showPasswordReset.set(false);
  },

  showReset() {
    this.showPasswordReset.set(true);
    this.state.set('form');
    this.message.set('');
  },

  hideReset() {
    this.showPasswordReset.set(false);
    this.state.set('form');
    this.message.set('');
  },
};
