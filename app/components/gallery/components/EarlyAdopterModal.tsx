import { memo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DialogRoot, Dialog, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import { Rocket } from 'lucide-react';
import { toast } from 'react-toastify';
import { registerEarlyAdopter } from '~/lib/replay/ReferenceApps';
import { assert } from '~/utils/nut';
import type { User } from '@supabase/supabase-js';

interface EarlyAdopterModalProps {
  isOpen: boolean;
  onClose: () => void;
  appPath: string;
  user: User | null;
}

export const EarlyAdopterModal = memo(({ isOpen, onClose, appPath, user }: EarlyAdopterModalProps) => {
  const [useCase, setUseCase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to become an early adopter');
      return;
    }

    if (!useCase.trim()) {
      toast.error('Please describe your use case');
      return;
    }

    assert(appPath, 'App path is required');

    try {
      setIsSubmitting(true);
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || undefined;
      await registerEarlyAdopter({
        path: appPath,
        user_name: userName,
        user_email: user?.email,
        use_case_description: useCase.trim(),
      });

      setUseCase('');
      onClose();
      toast.success("Thank you for your interest! We'll be in touch soon.");
    } catch (error) {
      console.error('Error submitting early adopter registration:', error);
      toast.error('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <Dialog onBackdrop={onClose} onClose={onClose}>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Rocket size={20} className="text-rose-500" />
                Be an Early Adopter
              </div>
            </DialogTitle>
            <DialogDescription>
              <p className="mb-4">
                Help us improve this template by becoming an early adopter. Share your use case and get priority
                support!
              </p>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe how you plan to use this template..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 min-h-[100px] resize-none"
              />
            </DialogDescription>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button
                variant="outline"
                className="!text-foreground border-border hover:bg-accent"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!useCase.trim() || isSubmitting}
                className="!bg-rose-500 hover:!bg-rose-600 text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </Dialog>
        </DialogRoot>
      )}
    </AnimatePresence>
  );
});

EarlyAdopterModal.displayName = 'EarlyAdopterModal';
