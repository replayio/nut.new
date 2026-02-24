import { memo, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { toast } from 'react-toastify';
import { addTrackerAppReview } from '~/lib/replay/ReferenceApps';
import { assert } from '~/utils/nut';
import { classNames } from '~/utils/classNames';
import type { User } from '@supabase/supabase-js';

interface ReviewFormProps {
  appPath: string;
  user: User | null;
  onReviewSubmitted?: () => void;
  showAssociationNotice?: boolean;
}

export const ReviewForm = memo(
  ({ appPath, user, onReviewSubmitted, showAssociationNotice = true }: ReviewFormProps) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!user) {
        toast.error('Please log in to submit a review');
        return;
      }

      if (rating === 0) {
        toast.error('Please select a rating');
        return;
      }

      assert(appPath, 'App path is required');

      try {
        setIsSubmitting(true);
        const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || undefined;
        await addTrackerAppReview({
          path: appPath,
          rating,
          user_name: userName,
          user_email: user?.email,
          comment: comment.trim() || undefined,
        });

        setRating(0);
        setComment('');
        toast.success('Review submitted successfully');
        onReviewSubmitted?.();
      } catch (error) {
        console.error('Error submitting review:', error);
        toast.error('Failed to submit review. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!user) {
      return <p className="text-sm text-amber-600 dark:text-amber-400">Please log in to submit a review.</p>;
    }

    return (
      <div className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                disabled={isSubmitting}
                className={classNames(
                  'focus:outline-none transition-transform',
                  isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:scale-110',
                )}
              >
                <Star
                  size={24}
                  className={classNames(
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground hover:text-yellow-400/50',
                  )}
                />
              </button>
            ))}
            {rating > 0 && <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>}
          </div>
        </div>

        {/* Review Association Notification */}
        {showAssociationNotice && (
          <div className="p-3 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground">
              Your review will be associated with{' '}
              <span className="font-medium text-foreground">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'your account'}
              </span>
            </p>
          </div>
        )}

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this app (optional)"
            rows={4}
            disabled={isSubmitting}
            className={classNames(
              'w-full px-3 py-2 bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 resize-none',
              isSubmitting ? 'cursor-not-allowed opacity-50' : '',
            )}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full sm:w-auto !bg-rose-500 hover:!bg-rose-600 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    );
  },
);

ReviewForm.displayName = 'ReviewForm';
