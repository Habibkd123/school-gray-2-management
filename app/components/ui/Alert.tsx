import React, { useState } from 'react';
import { X } from 'lucide-react';

export type AlertVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
export type AlertType = 'default' | 'solid' | 'bordered';

export interface AlertProps {
  variant?: AlertVariant;
  type?: AlertType;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<AlertType, Record<AlertVariant, string>> = {
  default: {
    primary: 'bg-[#EFF6FF] text-[#3B82F6]',
    secondary: 'bg-[#ECFEFF] text-[#06B6D4]',
    success: 'bg-[#ECFDF5] text-[#10B981]',
    danger: 'bg-[#FEF2F2] text-[#EF4444]',
    warning: 'bg-[#FFFBEB] text-[#1E3A5F]',
    info: 'bg-[#EFF6FF] text-[#2563EB]',
    light: 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#64748B]',
    dark: 'bg-[#E2E8F0] text-[#0F172A]',
  },
  solid: {
    primary: 'bg-[#3B82F6] text-white',
    secondary: 'bg-[#06B6D4] text-white',
    success: 'bg-[#10B981] text-white',
    danger: 'bg-[#EF4444] text-white',
    warning: 'bg-[#1E3A5F] text-white',
    info: 'bg-[#2563EB] text-white',
    light: 'bg-[#F1F5F9] text-[#475569]',
    dark: 'bg-[#0F172A] text-white',
  },
  bordered: {
    primary: 'bg-white dark:bg-slate-900 border border-[#3B82F6] text-[#3B82F6]',
    secondary: 'bg-white dark:bg-slate-900 border border-[#06B6D4] text-[#06B6D4]',
    success: 'bg-white dark:bg-slate-900 border border-[#10B981] text-[#10B981]',
    danger: 'bg-white dark:bg-slate-900 border border-[#EF4444] text-[#EF4444]',
    warning: 'bg-white dark:bg-slate-900 border border-[#1E3A5F] text-[#1E3A5F]',
    info: 'bg-white dark:bg-slate-900 border border-[#2563EB] text-[#2563EB]',
    light: 'bg-white dark:bg-slate-900 border border-[#E2E8F0] text-[#64748B]',
    dark: 'bg-white dark:bg-slate-900 border border-[#0F172A] text-[#0F172A]',
  }
};

export function Alert({ 
  variant = 'primary', 
  type = 'default', 
  icon, 
  dismissible = false, 
  onDismiss, 
  children,
  className = ''
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const baseStyles = 'relative px-4 py-3 rounded-lg text-[13px] font-medium flex items-start gap-3 w-full leading-relaxed';
  const styles = variantStyles[type][variant];
  
  // Adjusted text color for the close button based on the alert type
  const closeBtnColor = type === 'solid' && variant !== 'light' ? 'text-white/80 hover:text-white' : 'text-current opacity-60 hover:opacity-100';

  return (
    <div className={`${baseStyles} ${styles} ${className}`}>
      {icon && (
        <div className="shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
      {dismissible && (
        <button 
          onClick={handleDismiss}
          className={`shrink-0 ml-auto transition-opacity ${closeBtnColor}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
