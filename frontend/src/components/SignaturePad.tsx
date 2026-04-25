import { useState, ChangeEvent } from 'react';

interface SignaturePadProps {
  onSign: (signature: string) => void;
}

export function SignaturePad({ onSign }: SignaturePadProps) {
  const [signature, setSignature] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSignature(e.target.value);
  };

  const handleSubmit = () => {
    if (signature.trim().length > 0) {
      onSign(signature);
    }
  };

  return (
    <div className="signature-pad-container">
      <label className="persistent-label" style={{ fontSize: '14px', marginBottom: '4px' }}>Type your full legal name to electronically sign:</label>
      <input 
        type="text" 
        className="signature-input"
        value={signature}
        onChange={handleChange}
        placeholder="e.g. John Doe"
      />
      <button 
        className="primary-action" 
        style={{ minHeight: '44px', marginTop: '8px', fontSize: '16px' }}
        disabled={signature.trim().length === 0}
        onClick={handleSubmit}
      >
        Sign SSA-827
      </button>
    </div>
  );
}
