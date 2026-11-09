import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, CheckCircle2, AlertCircle, Save, Trash2, X, Settings2, ChevronRight, UserRound, Bell, Target, SlidersHorizontal, ScanLine, Activity, CalendarDays } from 'lucide-react';
import { FocoV6Status } from '../components/FocoV6UI';
import { AccessibleDialog } from '../components/AccessibleDialog';

interface ProfilePageProps { setActiveTab: (tab: string) => void; }
export const ProfilePage: React.FC<ProfilePageProps> = ({ setActiveTab }) => {
  const { user, profile, refreshProfile, deleteAccount } = useAuth();

  const [trainingSummary,setTrainingSummary]=useState<{completed:number;consistency:number|null;weeks:number}|null>(null);
  useEffect(()=>{let active=true;Promise.all([api.getSessions(),api.getActiveWorkout()]).then(([list,plan])=>{
    if(!active)return;
    const completed=list.filter(s=>s.status==='completed');
    const weeks=new Set(completed.map(s=>{const date=new Date(s.started_at);date.setHours(0,0,0,0);date.setDate(date.getDate()-((date.getDay()+6)%7));return date.toISOString().slice(0,10);})).size;
    const cutoff=Date.now()-28*86400000;
    const last28=completed.filter(s=>new Date(s.started_at).getTime()>=cutoff).length;
    const target=plan?.weekly_frequency||0;
    setTrainingSummary({completed:completed.length,weeks,consistency:target?Math.min(100,Math.round(last28/(target*4)*100)):null});
  }).catch(()=>{});return()=>{active=false;};},[]);
  const [fullName, setFullName] = useState(profile?.full_name || user?.full_name || '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '');
  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg?.toString() || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || 'intermediario');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBirthDate(profile.birth_date || '');
      setHeightCm(profile.height_cm?.toString() || '');
      setWeightKg(profile.current_weight_kg?.toString() || '');
      setExperienceLevel(profile.experience_level || 'intermediario');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);

    try {
      await api.updateProfile({
        full_name: fullName,
        birth_date: birthDate || undefined,
        height_cm: Number(heightCm) || undefined,
        current_weight_kg: Number(weightKg) || undefined,
        experience_level: experienceLevel as any,
      });

      await refreshProfile();
      setMsg({ type: 'success', text: 'Perfil biométrico atualizado com sucesso no banco!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Falha ao atualizar perfil: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') {
      setMsg({ type: 'error', text: 'Digite "EXCLUIR" exatamente para confirmar.' });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Falha ao excluir conta: ' + err.message });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const initials=(fullName||user?.full_name||'F').trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('');
  const routes=[
    {label:'Meus dados corporais',icon:ScanLine,tab:'arquivos'},
    {label:'Metas e objetivos',icon:Target,tab:'objetivos'},
    {label:'Preferências de treino',icon:SlidersHorizontal,tab:'anamnese'},
    {label:'Integrações',icon:Activity,tab:'configuracoes'},
    {label:'Notificações',icon:Bell,tab:'configuracoes'},
  ];
  return (
    <div className="foco-v6-profile foco-v4-page">
      <p role="status" className="sr-only">{msg?.type === 'success' ? msg.text : ''}</p>
      <div className="md:hidden"><FocoV6Status/></div>
      <header className="foco-v6-profile-top">
        <h1>Perfil</h1><button className="foco-v6-icon-button" type="button" onClick={()=>setActiveTab('configuracoes')} aria-label="Abrir configurações"><Settings2 size={19}/></button>
      </header>
      <section className="foco-v6-profile-card">
        <div className="foco-v6-profile-avatar grid place-items-center">
          <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#303B23] to-[#0C100B] text-2xl font-black text-[#C8F040]">{initials}</span>
        </div>
        <h2>{fullName||user?.full_name||'Atleta FOCO'}</h2>
        <span className="mt-1 rounded-full bg-[#C8F040]/10 px-3 py-1 text-[10px] font-bold text-[#C8F040]">Plano pessoal</span>
      </section>
      <div className="foco-v6-profile-kpis">
        <div className="foco-v6-profile-kpi"><strong>{trainingSummary?.completed??'—'}</strong><p>Treinos</p></div>
        <div className="foco-v6-profile-kpi"><strong>{trainingSummary?.consistency===null?'—':trainingSummary?.consistency===undefined?'—':trainingSummary.consistency+'%'}</strong><p>Consistência (28 dias)</p></div>
        <div className="foco-v6-profile-kpi"><strong>{trainingSummary?.weeks??'—'}</strong><p>Semanas ativas</p></div>
      </div>
      <nav className="grid gap-2" aria-label="Preferências do perfil">
        {routes.map(route=><button key={route.label} type="button" className="foco-v6-profile-item" onClick={()=>setActiveTab(route.tab)}>
          <route.icon size={17}/><span>{route.label}</span><ChevronRight size={16}/>
        </button>)}
      </nav>
      <details className="foco-v6-glass rounded-2xl p-3">
        <summary className="cursor-pointer px-2 py-2 text-sm font-bold text-[#C8F040]">Editar meus dados <ChevronRight size={16} className="ml-2 inline"/></summary>
    <div className="foco-v5-profile foco-v4-page max-w-3xl space-y-5 text-white">
      
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="foco-v4-eyebrow mb-2">FOCO / SUA CONTA</p>
          <h1 className="foco-v4-heading">Meu perfil</h1>
          <p className="mt-2 text-xs text-neutral-400">Gerencie suas informações para personalizar a experiência de treino.</p>
        </div>
        <button type="button" onClick={() => setActiveTab('configuracoes')}
          aria-label="Configurações" className="foco-v4-secondary !px-3">
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      {msg && (
        <div
          role={msg.type === 'error' ? 'alert' : undefined}
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Fechar aviso" className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="foco-v4-panel space-y-5 p-5 sm:p-6">
        
        {/* User Identity Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#333] to-[#111] text-xl font-black text-white">
            {fullName.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-white tracking-wide">{fullName || 'Atleta FOCO'}</h3>
            <p className="text-xs text-neutral-400 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-full-name">Nome Completo</label>
            <input id="foco-profile-full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-email">E-mail Cadastrado</label>
            <input id="foco-profile-email"
              type="email"
              autoComplete="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A]/50 border border-white/5 text-neutral-500 text-xs cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-birth-date">Data de Nascimento</label>
            <input id="foco-profile-birth-date"
              type="date"
              autoComplete="bday"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-experience-level">Nível de Experiência</label>
            <select id="foco-profile-experience-level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            >
              <option value="iniciante">Iniciante (&lt; 1 ano)</option>
              <option value="intermediario">Intermediário (1 a 3 anos)</option>
              <option value="avancado">Avançado (&gt; 3 anos)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-weight-kg">Peso Atual (kg)</label>
            <input id="foco-profile-weight-kg"
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide" htmlFor="foco-profile-height-cm">Altura (cm)</label>
            <input id="foco-profile-height-cm"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-white" />
          <span>Zona de Segurança & Exclusão de Conta</span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          A exclusão da conta é irreversível e remove permanentemente todos os seus treinos, planos, avaliações corporais e arquivos de ficha do banco de dados.
        </p>

        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirmationText(''); }}
          disabled={isDeleting}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/15"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir Minha Conta Definitivamente</span>
        </button>
      </div>

      {/* In-UI Confirmation Modal (No window.alert / window.prompt) */}
      {showDeleteModal && (
        <AccessibleDialog title="Confirmar exclusão da conta" onClose={() => setShowDeleteModal(false)} initialFocus="#foco-delete-cancel" dismissible={!isDeleting}>
          <div className="w-full rounded-2xl bg-[#141414] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-white" />
                <span>Confirmar Exclusão</span>
              </h3>
              <button
                type="button"
                aria-label="Fechar confirmação de exclusão"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Esta ação não pode ser desfeita. Todos os dados associados ao seu e-mail serão apagados do PostgreSQL.
            </p>

            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1" htmlFor="foco-profile-delete-confirmation-text">
                Digite <strong className="text-white">EXCLUIR</strong> para prosseguir:
              </label>
              <input id="foco-profile-delete-confirmation-text"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-white/20 text-white text-xs font-mono uppercase focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                id="foco-delete-cancel"
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-neutral-300 text-xs font-bold hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR'}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-neutral-200 disabled:opacity-30"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
      </details>
    </div>
  );
};
