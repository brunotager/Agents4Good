interface StickyActionProps {
  disabled: boolean;
  onClick: () => void;
  label: string;
}

export function StickyAction({ disabled, onClick, label }: StickyActionProps) {
  return (
    <button 
      className="primary-action" 
      disabled={disabled} 
      onClick={onClick}
    >
      {label}
    </button>
  );
}
