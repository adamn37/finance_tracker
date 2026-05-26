"use client"

import React from "react";
import { ArrowUpRight, GripHorizontal, X, Lock } from "lucide-react";

interface WidgetWrapperProps {
  title: string;
  icon?: any;
  onClick?: () => void;
  children: React.ReactNode;
  isPremium?: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: any) => void;
  onDragEnter?: (e: any) => void;
  onDragEnd?: () => void;
}

export default function WidgetWrapper({
  title, icon: Icon, onClick, children, isPremium = false, isEditing = false, onRemove, draggable = false, onDragStart, onDragEnter, onDragEnd
}: WidgetWrapperProps) {
  return (
    <div 
      draggable={draggable} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()} onClick={!isEditing ? onClick : undefined}
      className={`bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border transition-all h-full flex flex-col relative overflow-hidden group 
      ${isEditing ? 'border-dashed border-2 border-blue-300 dark:border-blue-700 scale-[0.98] cursor-grab active:cursor-grabbing hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'}`}
    >
      {isEditing && (
        <div className="absolute top-0 left-0 w-full h-full z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 dark:bg-black/40 backdrop-blur-[1px]">
           <div className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-2 rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm"><GripHorizontal size={18} /> Drag to move</div>
        </div>
      )}
      {isEditing && onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-3 right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full z-20 hover:bg-red-200 dark:hover:bg-red-900 transition-colors shadow-sm"><X size={14} strokeWidth={3} /></button>
      )}
      <div className="flex justify-between items-center mb-4 relative z-0">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm uppercase tracking-wider">{Icon && <Icon size={16} className={isEditing ? "text-blue-400" : "text-gray-400 dark:text-gray-500"} />}{title}</h3>
        {!isEditing && (
          isPremium ? <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"><Lock size={10} /> Pro</span> : onClick && <ArrowUpRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
        )}
      </div>
      <div className={`flex-1 flex flex-col justify-center relative z-0 ${isEditing ? 'opacity-50 grayscale transition-all' : ''}`}>{children}</div>
    </div>
  );
}