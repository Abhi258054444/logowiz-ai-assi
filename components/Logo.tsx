import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-3 group cursor-pointer select-none">
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* 
            Displays logo.png from the public directory.
            Includes a fallback to a placeholder if the file is missing.
        */}
        <img 
          src="/logo.png" 
          alt="LogoWiz AI" 
          className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null; 
            e.currentTarget.src = "https://cdn.designfast.io/image/2026-02-13/8f027e03-8341-4ddd-bd8c-6dcfd9a5b9df.png";
          }}
        />
      </div>
      
      {/* Text */}
      <div className="flex flex-col justify-center">
        <h1 className="text-xl font-black text-slate-100 tracking-tight leading-none group-hover:text-primary transition-colors duration-300">
          LogoWiz
        </h1>
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase group-hover:text-primary transition-colors mt-0.5 opacity-80">
          AI Design Studio
        </p>
      </div>
    </div>
  );
};

export default Logo;