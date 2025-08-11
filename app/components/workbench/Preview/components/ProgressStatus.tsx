const ProgressStatus = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      <div className="text-lg font-medium text-bolt-elements-textHeading">Generating app mockup...</div>
      <div className="w-10 h-10 border-4 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin shadow-sm" />
    </div>
  );
};

export default ProgressStatus;
