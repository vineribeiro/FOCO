import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, CheckCircle2, AlertCircle, Save, Trash2, X } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile, deleteAccount } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || user?.full_name || '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '178');
  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg?.toString() || '80');
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Perfil do Atleta</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Gerencie seus dados antropométricos e parâmetros que alimentam o motor de treino.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-5">
        
        {/* User Identity Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] border border-white/20 flex items-center justify-center text-white text-xl font-black">
            {fullName.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-white tracking-wide">{fullName || 'Atleta FOCO'}</h3>
            <p className="text-xs text-neutral-400 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Nome Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">E-mail Cadastrado</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A]/50 border border-white/5 text-neutral-500 text-xs cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Data de Nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Nível de Experiência</label>
            <select
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
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Peso Atual (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Altura (cm)</label>
            <input
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-white/20 p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-white" />
                <span>Confirmar Exclusão</span>
              </h3>
              <button
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
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                Digite <strong className="text-white">EXCLUIR</strong> para prosseguir:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-white/20 text-white text-xs font-mono uppercase focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
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
        </div>
      )}
    </div>
  );
};
