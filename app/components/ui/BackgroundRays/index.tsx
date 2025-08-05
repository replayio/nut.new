const BackgroundRays = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-radial from-blue-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute -top-20 right-20 w-80 h-80 bg-gradient-radial from-green-500/8 via-green-500/4 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-40 left-1/3 w-64 h-64 bg-gradient-radial from-indigo-500/6 via-indigo-500/3 to-transparent rounded-full blur-2xl" />
    </div>
  );
};

export default BackgroundRays;
