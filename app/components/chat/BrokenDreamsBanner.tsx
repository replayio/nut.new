const BrokenDreamsBanner = () => {
  return (
    <div className="relative w-full max-w-chat mx-auto z-prompt mt-4 mb-4 sm:mb-10">
      <div className="flex flex-col items-center text-center space-y-3">
        <a href="/rebuild-broken-dreams" className="group">
          <button className="relative flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl min-h-[48px] transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group cursor-pointer">
            <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-transform duration-200 group-hover:scale-105">
              Rebuild Your Broken Apps
            </div>
          </button>
        </a>
        
        <p className="text-xs text-bolt-elements-textSecondary max-w-sm">
          Get $50 in credits + tech support to fix your vibe-broken projects
        </p>
      </div>
    </div>
  );
};

export default BrokenDreamsBanner;