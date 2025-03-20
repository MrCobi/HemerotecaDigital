"use client";

import { ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

export default function ActionButton({ children, onClick, className, disabled }: ActionButtonProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
