import { memo } from 'react';
import { classNames } from '~/utils/classNames';

interface AuthSelectorProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const AuthSelector = memo(({ className, checked = false, onCheckedChange }: AuthSelectorProps) => {
  const handleChange = () => {
    onCheckedChange?.(!checked);
  };

  return (
    <div className={classNames('flex items-start gap-3', className)}>
      <div className="relative flex items-center mt-0.5">
        <input
          type="checkbox"
          id="auth-required"
          checked={checked}
          onChange={handleChange}
          className="peer appearance-none h-5 w-5 rounded-lg border-2 border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 cursor-pointer checked:bg-bolt-elements-item-contentAccent checked:border-bolt-elements-item-contentAccent focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent/50 transition-all duration-200"
        />
        <svg
          className="absolute left-0 w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-200"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <label 
        className="text-bolt-elements-textSecondary cursor-pointer text-sm leading-relaxed" 
        htmlFor="auth-required"
      >
        Require users to login
      </label>
    </div>
  );
});

export default AuthSelector;
