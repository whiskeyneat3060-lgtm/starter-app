import { useRef, useState } from 'react';
import { Camera, Image, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeFood } from '../../lib/api';

export function FAB() {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: analyzeFood,
    onSuccess: (data) => {
      setResult(`Logged: ${data.description} — ${Math.round(data.totals.kcal)} kcal, ${Math.round(data.totals.protein_g)}g protein`);
      qc.invalidateQueries({ queryKey: ['food'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => { setResult(null); setOpen(false); }, 3000);
    },
    onError: () => {
      setResult('Could not analyze — please try again.');
      setTimeout(() => setResult(null), 3000);
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpen(false);
    setAnalyzing(true);
    try {
      await mutation.mutateAsync(file);
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  }

  return (
    <>
      {/* Toast */}
      {(analyzing || result) && (
        <div className="fixed top-4 inset-x-4 z-50 bg-elevated border border-border rounded-2xl p-4 shadow-xl animate-slide-up">
          {analyzing ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-energy border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-sm text-primary">Analyzing your meal…</span>
            </div>
          ) : (
            <p className="text-sm text-primary">{result}</p>
          )}
        </div>
      )}

      {/* Sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-24 inset-x-4 bg-elevated rounded-2xl overflow-hidden border border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-primary">Log food</span>
              <button onClick={() => setOpen(false)} className="text-muted"><X size={18} /></button>
            </div>
            <button
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-card transition-colors"
              onClick={() => { setOpen(false); cameraRef.current?.click(); }}
            >
              <Camera size={20} className="text-energy" />
              <span className="text-primary font-medium">Take a photo</span>
            </button>
            <button
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-card transition-colors"
              onClick={() => { setOpen(false); galleryRef.current?.click(); }}
            >
              <Image size={20} className="text-goal" />
              <span className="text-primary font-medium">Choose from gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(p => !p)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-energy flex items-center justify-center shadow-lg shadow-energy/30 active:scale-95 transition-transform"
        aria-label="Log food"
      >
        <Camera size={24} className="text-base" strokeWidth={2} />
      </button>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}
