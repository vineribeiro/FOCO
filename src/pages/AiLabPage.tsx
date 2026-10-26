import React, { useState } from 'react';
import { NewWorkoutPage } from './NewWorkoutPage';
import { SheetUploadPage } from './SheetUploadPage';
import { ProgressionReviewPage } from './ProgressionReviewPage';
import { WorkoutsPage } from './WorkoutsPage';
import { BrandIdentityPage } from './BrandIdentityPage';

interface AiLabProps {
  setActiveTab: (tab: string) => void;
}

export const AiLabPage: React.FC<AiLabProps> = ({ setActiveTab }) => {
  const [subTab, setSubTab] = useState<'generate' | 'upload' | 'review' | 'plans' | 'brand'>('generate');

  return (
    <div className="space-y-5 pb-32 max-w-md mx-auto">
      
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
      <div className="grid grid-cols-5 gap-1 p-1 bg-[#141414] rounded-2xl border border-white/10">
        <button
          onClick={() => setSubTab('generate')}
          className={`py-2 px-1 text-center rounded-xl text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
            subTab === 'generate' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Criar IA
        </button>
        <button
          onClick={() => setSubTab('upload')}
          className={`py-2 px-1 text-center rounded-xl text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
            subTab === 'upload' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Foto/PDF
        </button>
        <button
          onClick={() => setSubTab('review')}
          className={`py-2 px-1 text-center rounded-xl text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
            subTab === 'review' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Revisão
        </button>
        <button
          onClick={() => setSubTab('plans')}
          className={`py-2 px-1 text-center rounded-xl text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
            subTab === 'plans' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Planos
        </button>
        <button
          onClick={() => setSubTab('brand')}
          className={`py-2 px-1 text-center rounded-xl text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
            subTab === 'brand' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Marca
        </button>
      </div>

      {/* Sub Views */}
      <div className="pt-1">
        {subTab === 'generate' && <NewWorkoutPage setActiveTab={setActiveTab} />}
        {subTab === 'upload' && <SheetUploadPage setActiveTab={setActiveTab} />}
        {subTab === 'review' && <ProgressionReviewPage setActiveTab={setActiveTab} />}
        {subTab === 'plans' && <WorkoutsPage setActiveTab={setActiveTab} />}
        {subTab === 'brand' && <BrandIdentityPage setActiveTab={setActiveTab} />}
      </div>
    </div>
  );
};
