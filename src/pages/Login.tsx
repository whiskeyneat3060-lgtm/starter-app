import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { Delete } from 'lucide-react';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleKey(k: string) {
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (k === '') return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setLoading(true);
      try {
        await login(next);
        navigate('/');
      } catch {
        setError('Wrong PIN');
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-8 gap-10">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-primary">Recomp OS</h1>
        <p className="text-muted text-sm mt-1">Enter your PIN</p>
      </div>

      {/* Dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-energy scale-110' : 'bg-elevated border border-border'}`}
          />
        ))}
      </div>

      {error && <p className="text-danger text-sm -mt-6 animate-fade-in">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {KEYS.map((k, i) => (
          <button
            key={i}
            onClick={() => handleKey(k)}
            disabled={loading || k === ''}
            className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              k === '' ? 'invisible' :
              k === '⌫' ? 'bg-elevated text-muted' :
              'bg-elevated text-primary hover:bg-border active:bg-border'
            }`}
          >
            {k === '⌫' ? <Delete size={20} className="mx-auto" /> : k}
          </button>
        ))}
      </div>

      {loading && (
        <div className="w-6 h-6 rounded-full border-2 border-energy border-t-transparent animate-spin" />
      )}
    </div>
  );
}
