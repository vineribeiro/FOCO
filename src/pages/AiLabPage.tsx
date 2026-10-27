import React, { useState } from 'react';
import { NewWorkoutPage } from './NewWorkoutPage';
import { SheetUploadPage } from './SheetUploadPage';
import { ProgressionReviewPage } from './ProgressionReviewPage';
import { WorkoutsPage } from './WorkoutsPage';

interface AiLabProps {
  setActiveTab: (tab: string) => void;
}

export const AiLabPage: React.FC<AiLabProps> = ({ setActiveTab }) => {
  const [subTab, setSubTab] = useState<'generate' | 'upload' | 'review' | 'plans'>('generate');

  return (
    <div className="space-y-5 pb-32 w-full max-w-5xl mx-auto">
      
      {/* Top Title */}
      <div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
          Laboratório de Performance
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5 uppercase font-sans">
          FOCO LAB <span className="text-white">.</span>
        </h2>
      </div>

      {/* Segmented Controls (Monochrome Mobile) */}
      <div role="tablist" aria-label="Ferramentas de IA e fichas" className="grid grid-cols-2 gap-2 p-1 bg-[#141414] rounded-2xl border border-white/10 sm:grid-cols-4">
        <button
          role="tab" aria-selected={subTab === 'generate'} onClick={() => setSubTab('generate')}
          className={`py-2 px-1 text-center rounded-xl min-h-12 text-xs font-bold transition-all cursor-pointer ${
            subTab === 'generate' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Criar IA
        </button>
        <button
          role="tab" aria-selected={subTab === 'upload'} onClick={() => setSubTab('upload')}
          className={`py-2 px-1 text-center rounded-xl min-h-12 text-xs font-bold transition-all cursor-pointer ${
            subTab === 'upload' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Foto/PDF
        </button>
        <button
          role="tab" aria-selected={subTab === 'review'} onClick={() => setSubTab('review')}
          className={`py-2 px-1 text-center rounded-xl min-h-12 text-xs font-bold transition-all cursor-pointer ${
            subTab === 'review' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Revisão
        </button>
        <button
          role="tab" aria-selected={subTab === 'plans'} onClick={() => setSubTab('plans')}
          className={`py-2 px-1 text-center rounded-xl min-h-12 text-xs font-bold transition-all cursor-pointer ${
            subTab === 'plans' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Planos
        </button>
</div>

      {/* Sub Views */}
      <div className="pt-1">
        {subTab === 'generate' && <NewWorkoutPage setActiveTab={setActiveTab} />}
        {subTab === 'upload' && <SheetUploadPage setActiveTab={setActiveTab} />}
        {subTab === 'review' && <ProgressionReviewPage setActiveTab={setActiveTab} />}
        {subTab === 'plans' && <WorkoutsPage setActiveTab={setActiveTab} />}
      </div>
    </div>
  );
};
