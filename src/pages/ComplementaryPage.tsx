import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const exercises = [
  ['vacuum','Vacuum abdominal','Sem equipamento','Em pé','3 × 10 s','Controle abdominal; não reduz gordura localizada.'],
  ['deadbug','Dead Bug','Sem equipamento','No chão','2 × 8 por lado','Estabilidade do tronco.'],
  ['birddog','Bird Dog','Sem equipamento','No chão','2 × 8 por lado','Coordenação e estabilidade.'],
  ['sideplank','Prancha lateral','Sem equipamento','No chão','2 × 15 s por lado','Resistência dos oblíquos.'],
  ['bridge','Ponte de glúteos','Sem equipamento','No chão','2 × 12','Ativação de glúteos.'],
  ['pelvis','Retroversão pélvica','Sem equipamento','No chão','2 × 10','Controle pélvico.'],
  ['catcow','Gato-vaca','Sem equipamento','No chão','2 × 8','Mobilidade da coluna.'],
  ['breathing','Respiração diafragmática','Sem equipamento','Em pé','2 min','Respiração e relaxamento.'],
  ['march','Marcha estacionária','Sem equipamento','Em pé','2 × 30 s','Movimento leve.'],
  ['calves','Elevação de panturrilhas','Sem equipamento','Em pé','2 × 12','Resistência de panturrilhas.'],
  ['lateral','Caminhada lateral com mini band','Mini band','Em pé','2 × 8 passos por lado','Abdutores do quadril.'],
  ['abduction','Abdução de quadril com mini band','Mini band','Em pé','2 × 10 por lado','Estabilidade pélvica.'],
  ['squat','Agachamento com mini band','Mini band','Em pé','2 × 10','Quadríceps e glúteos.'],
  ['pullapart','Abertura de braços com mini band','Mini band','Em pé','2 × 10','Ombros e escápulas; usar faixa leve adequada.'],
] as const;
type Entry = { id: string; date: string; done: boolean };
export function ComplementaryPage() {
  const { user } = useAuth();
  const key = 'foco-complementary-v1-' + (user?.id || 'anonymous');
  const [state, setState] = useState<{ selected: string[]; history: Entry[] }>(() => {
    try { const raw = JSON.parse(localStorage.getItem(key) || '{}'); return { selected: Array.isArray(raw.selected) ? raw.selected : [], history: Array.isArray(raw.history) ? raw.history : [] }; }
    catch { return { selected: [], history: [] }; }
  });
  const [filter, setFilter] = useState('Todos');
  const save = (next: typeof state) => { setState(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch {} };
  const visible = useMemo(() => exercises.filter(e => filter === 'Todos' || e[2] === filter || e[3] === filter), [filter]);
  const today = new Date().toLocaleDateString('en-CA');
  return <section className="mx-auto max-w-3xl space-y-5 text-white">
    <header className="space-y-2"><p className="text-xs uppercase tracking-[.2em] text-neutral-400">FOCO / ATIVIDADES</p><h1 className="text-3xl font-black">Exercícios extras</h1><p className="text-sm text-neutral-400">Escolha livremente. Não substitui sua ficha de musculação nem gera penalidade por não realizar.</p></header>
    <div className="flex flex-wrap gap-2">{['Todos','Em pé','No chão','Mini band','Sem equipamento'].map(f => <button key={f} type="button" onClick={() => setFilter(f)} className={'rounded-full border px-3 py-2 text-xs font-semibold '+(filter===f?'bg-white text-black':'border-white/20 text-neutral-300')}>{f}</button>)}</div>
    <div className="space-y-3">{visible.map(([id,name,equipment,position,prescription,description]) => {
      const selected = state.selected.includes(id);
      const completed = state.history.some(h => h.id === id && h.date === today && h.done);
      return <article key={id} className="rounded-2xl border border-white/10 bg-[#171717] p-4">
        <div className="flex items-start gap-3"><input aria-label={'Selecionar '+name} type="checkbox" checked={selected} onChange={e => save({...state,selected:e.target.checked?[...state.selected,id]:state.selected.filter(x=>x!==id)})} className="mt-1 h-5 w-5 accent-white"/><div className="flex-1"><h2 className="font-bold">{name}</h2><p className="mt-1 text-xs text-neutral-400">{equipment} · {position} · {prescription}</p><p className="mt-2 text-sm text-neutral-300">{description}</p></div></div>
        {selected && <button type="button" onClick={() => save({...state,history:[...state.history.filter(h=>!(h.id===id&&h.date===today)),{id,date:today,done:!completed}]})} className={'mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold '+(completed?'border border-white/30 text-white':'bg-white text-black')}>{completed?'✓ Concluído hoje · Desfazer':'Registrar como concluído'}</button>}
      </article>;
    })}</div>
    <div className="rounded-2xl border border-white/10 p-4"><h2 className="font-bold">Histórico local</h2><p className="mt-1 text-sm text-neutral-400">{state.history.filter(h=>h.done).length} atividades registradas neste dispositivo. Estes dados ainda não são sincronizados com a conta.</p></div>
    <p className="text-xs leading-5 text-neutral-400">Comece com intensidade leve e sem dor; evite prender a respiração. Em caso de dor muscular desproporcional, fraqueza importante ou urina escura, interrompa a atividade e procure atendimento.</p>
  </section>;
}
