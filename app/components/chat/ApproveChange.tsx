import React from 'react';

interface ApproveChangeProps {
  onApprove: () => void;
  onReject: () => void;
}

const ApproveChange: React.FC<ApproveChangeProps> = ({ onApprove, onReject }) => {
  return (
    <div className="flex items-center gap-1 w-full h-[30px] pt-2">
      <button
        onClick={onReject}
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
