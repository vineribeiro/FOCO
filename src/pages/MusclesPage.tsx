import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkoutPlan } from '../types';
import { Anatomy3DViewer } from '../components/Anatomy3DViewer';
import {
  Dumbbell,
  Sparkles,
  Activity,
  Layers,
  ChevronRight,
  Rotate3d,
} from 'lucide-react';

interface MusclesPageProps {
  onOpenExercise3D: (exName: string, group: string) => void;
  setActiveTab: (tab: string) => void;
}

export const MusclesPage: React.FC<MusclesPageProps> = ({ onOpenExercise3D, setActiveTab }) => {
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Peito');
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);

  const muscleGroups = [
    { name: 'Peito', slug: 'chest', recovery: 100, status: 'Pronto para Treinar' },
    { name: 'Costas', slug: 'back', recovery: 100, status: 'Recuperado' },
    { name: 'Bíceps', slug: 'biceps', recovery: 80, status: 'Em Recuperação' },
    { name: 'Ombros', slug: 'shoulders', recovery: 60, status: 'Fadiga Leve' },
    { name: 'Quadríceps', slug: 'quads', recovery: 100, status: 'Recuperado' },
    { name: 'Tríceps', slug: 'triceps', recovery: 75, status: 'Em Recuperação' },
  ];

  useEffect(() => {
    async function fetchPlan() {
      try {
        const p = await api.getActiveWorkout();
        setActivePlan(p);
      } catch (e) {
        console.error(e);
      }
    }
    fetchPlan();
  }, []);

  const matchingExercises = (activePlan?.exercises || []).filter((ex) =>
    ex.muscle_group.toLowerCase().includes(selectedMuscle.toLowerCase()) ||
    selectedMuscle.toLowerCase().includes(ex.muscle_group.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-32 max-w-md mx-auto">
      
      {/* Fitbod Top Recovery Header (Monochrome) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
            Recuperação Muscular
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
            Target Muscles <span className="text-white text-xl">+</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#0E1015] border border-white/10 text-center font-mono">
            <span className="text-[9px] text-neutral-500 block uppercase">Último Treino</span>
            <span className="text-xs font-black text-white">Há 2 dias</span>
          </div>
        </div>
      </div>

      {/* Target Muscles Horizontal Carousel (Monochrome) */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {muscleGroups.map((m) => {
          const isSelected = selectedMuscle === m.name;

          return (
            <button
              key={m.name}
              onClick={() => setSelectedMuscle(m.name)}
              className={`p-3 rounded-2xl border flex flex-col justify-between shrink-0 w-28 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-black border-white shadow-xl'
                  : 'bg-[#0E1015] text-white border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                    isSelected ? 'bg-black text-white' : 'bg-white/10 text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-mono font-black tabular-nums ${isSelected ? 'text-black' : 'text-white'}`}>
                  {m.recovery}%
                </span>
              </div>

              <div>
                <p className={`text-xs font-black tracking-tight ${isSelected ? 'text-black' : 'text-white'}`}>{m.name}</p>
                <p className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>{m.status}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3D Anatomical Character Card in Grayscale */}
      <div className="rounded-3xl bg-[#0E1015] border border-white/10 overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#14171D]">
          <div className="flex items-center gap-2">
            <Rotate3d className="w-4 h-4 text-white" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Anatomia 3D: <span className="text-white">{selectedMuscle}</span>
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">360° Touch</span>
        </div>

        {/* 3D Viewport */}
        <div className="h-72 w-full relative">
          <Anatomy3DViewer
            exerciseName={`Foco em ${selectedMuscle}`}
            muscleGroup={selectedMuscle}
            isModal={false}
          />
        </div>
      </div>

      {/* Exercises targeting the selected muscle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <span>Exercícios para {selectedMuscle}</span>
            <span className="text-xs text-neutral-400 font-mono">({matchingExercises.length})</span>
          </h3>

          <button
            onClick={() => setActiveTab('treinos')}
            className="text-[11px] text-white font-bold hover:underline"
          >
            Ver toda a ficha
          </button>
        </div>

        {matchingExercises.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#0E1015] border border-dashed border-white/10 text-center text-xs text-neutral-500">
            Nenhum exercício para {selectedMuscle} na sua ficha ativa no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {matchingExercises.map((ex, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#0E1015] border border-white/10 hover:border-white/30 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#000000] border border-white/10 flex items-center justify-center text-white shrink-0 font-bold">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">{ex.exercise_name}</h4>
                    <p className="text-[11px] font-mono text-neutral-400">
                      {ex.sets} séries · {ex.reps_min}-{ex.reps_max} reps · {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : 'Livre'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenExercise3D(ex.exercise_name, ex.muscle_group)}
                  className="px-3 py-1.5 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 hover:bg-neutral-200"
                >
                  <span>Ver 3D</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
