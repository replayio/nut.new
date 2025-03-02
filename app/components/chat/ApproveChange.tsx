import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { TEXTAREA_MIN_HEIGHT } from './BaseChat';

interface ApproveChangeProps {
  onApprove: () => void;
  onReject: () => void;
}

const ApproveChange: React.FC<ApproveChangeProps> = ({ onApprove, onReject }) => {
  const [hasRejected, setHasRejected] = useState(false);

  const onStartReject = () => {
    setHasRejected(true);
  };

  if (hasRejected) {
    return (
      <>
        <div
          className={classNames(
            'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg bg-red-50 mt-3',
          )}
        >
          <textarea
            className={classNames(
              'w-full pl-4 pt-4 pr-25 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
              'transition-all duration-200',
              'hover:border-bolt-elements-focus'
            )}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (event.shiftKey) {
                  return;
                }

                event.preventDefault();
              }
            }}
            style={{
              minHeight: TEXTAREA_MIN_HEIGHT,
              maxHeight: 400,
            }}
            placeholder="What is wrong with our changes?"
            translate="no"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full mb-2">
          <input
            type="checkbox"
            id="share-project"
            className="rounded border-red-300 text-red-500 focus:ring-red-500"
          />
          <label htmlFor="share-project" className="text-sm text-red-600">
            Share with Nut team
          </label>
        </div>

        <div className="flex items-center gap-1 w-full h-[30px] pt-2">
          <button
            onClick={() => {}}
            className="flex-1 h-[30px] flex justify-center items-center bg-red-100 border border-red-500 text-red-500 hover:bg-red-200 hover:text-red-600 transition-colors rounded"
            aria-label="Cancel changes"
            title="Cancel changes"
          >
            <div className="i-ph:x-bold"></div>
          </button>
          <button
            onClick={() => {}}
            className="flex-1 h-[30px] flex justify-center items-center bg-green-100 border border-green-500 text-green-500 hover:bg-green-200 hover:text-green-600 transition-colors rounded"
            aria-label="Try changes again"
            title="Try changes again"
          >
            <div className="i-ph:repeat-bold"></div>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1 w-full h-[30px] pt-2">
      <button
        onClick={onStartReject}
        className="flex-1 h-[30px] flex justify-center items-center bg-red-100 border border-red-500 text-red-500 hover:bg-red-200 hover:text-red-600 transition-colors rounded"
        aria-label="Reject change"
        title="Reject change"
      >
        <div className="i-ph:thumbs-down-bold"></div>
      </button>
      <button
        onClick={onApprove}
        className="flex-1 h-[30px] flex justify-center items-center bg-green-100 border border-green-500 text-green-500 hover:bg-green-200 hover:text-green-600 transition-colors rounded"
        aria-label="Approve change"
        title="Approve change"
      >
        <div className="i-ph:thumbs-up-bold"></div>
      </button>
    </div>
  );
};

export default ApproveChange;
