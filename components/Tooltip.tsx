
import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute top-full mt-2 w-max max-w-xs p-2 text-sm text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        {text}
        <svg className="absolute text-slate-700 h-2 w-full left-0 bottom-full rotate-180" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
        </svg>
      </div>
    </div>
  );
};

export default Tooltip;