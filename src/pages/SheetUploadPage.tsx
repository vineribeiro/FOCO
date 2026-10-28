import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { UploadedFile, WorkoutExercise } from '../types';
import {
  FileUp,
  Image,
  FileText,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Activity,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function getSupportedMimeType(file: File): string | null {
  const reportedType = (file.type || '').toLowerCase().split(';')[0].trim();
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(reportedType)) return reportedType;
  const extension = file.name.toLowerCase().split('.').pop() || '';
  return MIME_BY_EXTENSION[extension] || null;
}

function readAsNormalizedDataUrl(file: File, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('O navegador não conseguiu ler o conteúdo do arquivo.'));
        return;
      }
      const separator = reader.result.indexOf(',');
      if (separator < 0) {
        reject(new Error('O arquivo foi lido em um formato inválido.'));
        return;
      }
      // Android/iOS file pickers sometimes report application/octet-stream.
      // Normalize the data URL header to match the verified extension/MIME.
      resolve(`data:${mimeType};base64,${reader.result.slice(separator + 1)}`);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo no celular. Tente selecionar o arquivo novamente.'));
    reader.onabort = () => reject(new Error('A leitura do arquivo foi cancelada.'));
    reader.readAsDataURL(file);
  });
}

type BodyReport = { summary: string; metrics: { name: string; value: string; interpretation: string }[]; strengths: string[]; attention_points: string[]; training_recommendations: string[]; nutrition_discussion: string[]; questions_for_professional: string[]; limitations: string };

interface SheetUploadProps {
  setActiveTab: (tab: string) => void;
}

export const SheetUploadPage: React.FC<SheetUploadProps> = ({ setActiveTab }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadMode, setUploadMode] = useState<'workout' | 'body'>(() => {
    try {
      const requested = sessionStorage.getItem('foco_upload_mode');
      sessionStorage.removeItem('foco_upload_mode');
      return requested === 'body' ? 'body' : 'workout';
    } catch {
      return 'workout';
    }
  });
  const [bodyContext, setBodyContext] = useState('');
  const [bodyReport, setBodyReport] = useState<BodyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewUpload, setShowNewUpload] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected file for upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Extracted preview ready for user confirmation
  const [extractedResult, setExtractedResult] = useState<{
    plan_name: string;
    goal: string;
    weekly_frequency: number;
    confidence_notes: string;
    extracted_exercises: WorkoutExercise[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestBodyFile = files.find(file => file.processing_status === 'processed' && file.extracted_data && typeof file.extracted_data.summary === 'string' && Array.isArray(file.extracted_data.metrics));
  const savedBodyReport = latestBodyFile?.extracted_data as BodyReport | undefined;
  const displayedBodyReport = bodyReport || savedBodyReport || null;
  const lastBodyDate = latestBodyFile ? new Date(latestBodyFile.created_at) : null;
  const daysSinceBody = lastBodyDate ? Math.floor((Date.now() - lastBodyDate.getTime()) / 86400000) : null;

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFiles();
      setFiles(data);
    } catch (e: any) {
      console.error('Error fetching files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = getSupportedMimeType(file);
    if (!mimeType) {
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setErrorMsg('Formato não reconhecido. Escolha um PDF, JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setErrorMsg('O arquivo ultrapassa 10 MB. Exporte em PDF mais leve ou envie uma imagem comprimida.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedResult(null);
    setBodyReport(null);

    if (mimeType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setFilePreviewUrl(typeof event.target?.result === 'string' ? event.target.result : null);
      reader.onerror = () => setFilePreviewUrl(null);
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const readSelectedFile = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    if (file.size > MAX_FILE_BYTES) throw new Error('O limite para leitura é 10 MB.');
    const mimeType = getSupportedMimeType(file);
    if (!mimeType) throw new Error('Formato não suportado. Envie PDF, JPG, PNG ou WebP.');
    const base64 = await readAsNormalizedDataUrl(file, mimeType);
    return { base64, mimeType };
  };

  const handleProcessSheet = async () => {
    if (!selectedFile) {
      setErrorMsg('Selecione um arquivo PDF ou imagem primeiro.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedResult(null);

    try {
      const { base64, mimeType } = await readSelectedFile(selectedFile);
      const result = await api.extractWorkoutFromSheet({
        base64,
        mime_type: mimeType,
        filename: selectedFile.name,
        notes,
      });
      if (!Array.isArray(result.extracted_exercises) || result.extracted_exercises.length === 0) {
        throw new Error('A IA não encontrou exercícios legíveis. Envie uma foto mais nítida ou o PDF original, mostrando a ficha inteira.');
      }
      setExtractedResult(result);
      setSuccessMsg(`Encontramos ${result.extracted_exercises.length} exercícios. Revise os dados antes de salvar sua ficha.`);
      void loadFiles();
    } catch (err: any) {
      const message = String(err?.message || 'Erro desconhecido');
      setErrorMsg(message.includes('Sessão') || message.includes('token')
        ? 'Sua sessão expirou. Entre novamente no FOCO e tente enviar a ficha mais uma vez.'
        : 'Não foi possível ler essa ficha: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeBodyReport = async () => {
    if (!selectedFile) { setErrorMsg('Selecione o relatório da balança primeiro.'); return; }
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setBodyReport(null);
    try {
      const { base64, mimeType } = await readSelectedFile(selectedFile);
      const result = await api.analyzeBioimpedanceReport({ base64, mime_type: mimeType, filename: selectedFile.name, context: bodyContext });
      setBodyReport(result);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setShowNewUpload(false);
      void loadFiles();
      setSuccessMsg('Relatório analisado e armazenado. Na geração de treino, você poderá escolher se quer usar essas métricas.');
    } catch (err: any) {
      const message = String(err?.message || 'Erro desconhecido');
      setErrorMsg(message.includes('Sessão') || message.includes('token')
        ? 'Sua sessão expirou. Entre novamente no FOCO e tente enviar o relatório mais uma vez.'
        : 'Não foi possível analisar o relatório: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleConfirmAndSavePlan = async () => {
    if (!extractedResult) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      await api.createWorkout({
        name: extractedResult.plan_name || 'Ficha Importada - ' + (selectedFile?.name || 'Academia'),
        goal: extractedResult.goal || 'Treino Geral',
        weekly_frequency: extractedResult.weekly_frequency || 4,
        status: 'ativo',
        exercises: extractedResult.extracted_exercises,
      });

      setSuccessMsg('Ficha de treino salva e ativada no seu banco com sucesso!');
      setTimeout(() => {
        setActiveTab('treinos');
      }, 1200);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar ficha importada: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFile = async (file: UploadedFile) => {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      const result = await api.getFileDownloadUrl(file.id);
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
    } catch (e: any) {
      tab?.close();
      setErrorMsg('Falha ao abrir o original do arquivo: ' + (e?.message || 'tente novamente.'));
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!window.confirm('Excluir o arquivo enviado? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deleteFile(id);
      await loadFiles();
    } catch (e: any) {
      setErrorMsg('Falha ao excluir arquivo: ' + e.message);
    }
  };

  return (
    <div className="foco-v4-page space-y-5 text-white">
      
      {/* Top Header */}
      <div className="space-y-2">
        <p className="foco-v4-eyebrow">FOCO · {uploadMode === 'body' ? 'Seu perfil corporal' : 'Importação inteligente'}</p>
        <h1 className="foco-v4-heading">{uploadMode === 'body' ? <>Avaliação <span className="font-normal text-neutral-400">corporal</span></> : <>Importar <span className="font-normal text-neutral-400">ficha</span></>}</h1>
        <p className="foco-v4-muted">{uploadMode === 'body'
          ? 'Baseada no relatório OKOK. A IA explica as medições e apoia a personalização dos seus treinos.'
          : 'Digitalize uma ficha existente por PDF ou imagem e revise cada exercício antes de salvar.'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#141414] p-1">
        <button type="button" onClick={() => { setUploadMode('workout'); setBodyReport(null); setErrorMsg(null); }} className={`rounded-xl px-3 py-3 text-left transition-colors ${uploadMode === 'workout' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>
          <span className="block text-xs font-extrabold">Ficha de treino</span><span className="block text-[10px] mt-1 opacity-75">Importar exercícios</span>
        </button>
        <button type="button" onClick={() => { setUploadMode('body'); setExtractedResult(null); setErrorMsg(null); }} className={`rounded-xl px-3 py-3 text-left transition-colors ${uploadMode === 'body' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>
          <span className="block text-xs font-extrabold">Avaliação OKOK</span><span className="block text-[10px] mt-1 opacity-75">Bioimpedância e metabolismo</span>
        </button>
      </div>
      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/20 text-neutral-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-white/10 border border-white/30 text-white text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Existing OKOK assessments open with a compact upload action; first assessments show upload immediately. */}
      {uploadMode === 'body' && displayedBodyReport && !showNewUpload && (
        <button type="button" onClick={() => setShowNewUpload(true)}
          className="foco-v4-panel flex min-h-[98px] w-full items-center gap-3 p-4 text-left transition hover:border-white/35">
          <span className="foco-v4-info-icon !h-14 !w-14"><FileUp className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[14px]">Enviar avaliação OKOK</strong>
            <span className="mt-1 block text-xs text-neutral-400">Atualize suas medições com um novo PDF ou imagem.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </button>
      )}
      {/* Upload OKOK or workout sheet; remain the same secure file flow. */}
      {(uploadMode === 'workout' || !displayedBodyReport || showNewUpload) && (
      <section className="foco-v4-panel space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="foco-v4-info-icon"><FileUp className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="foco-v4-section-title">{uploadMode === 'body' ? 'Enviar avaliação OKOK' : 'Enviar ficha existente'}</h2>
            <p className="mt-1 text-xs text-neutral-400">PDF, imagem ou captura de tela · até 10 MB.</p>
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </div>
        <div className="relative rounded-2xl border border-dashed border-white/25 bg-[#101010] p-5 text-center transition hover:border-white/50 sm:p-6">
          <input type="file" ref={fileInputRef} onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
            id="foco-body-file" aria-label={uploadMode === 'body' ? 'Selecionar avaliação OKOK' : 'Selecionar ficha de treino'} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center" aria-label="Selecionar PDF ou imagem">


          <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
            <FileUp className="w-6 h-6" />
          </div>

          <h4 className="text-sm font-bold text-white">
            {selectedFile ? selectedFile.name : 'Toque para selecionar PDF ou imagem'}
          </h4>
          <p className="text-xs text-neutral-400 mt-1">
            PDF, JPG, PNG ou WebP · até 10 MB
          </p>

          {selectedFile && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Arquivo: {(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}
          </button>
        </div>

        {/* Image Preview if available */}
        {filePreviewUrl && (
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-white/10 flex items-center gap-3">
            <img
              src={filePreviewUrl}
              alt={uploadMode === 'body' ? 'Prévia da avaliação' : 'Prévia da ficha'}
              className="w-16 h-16 object-cover rounded-lg border border-white/15 shrink-0"
            />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Prévia do Arquivo</p>
              <p className="text-neutral-400 text-[11px]">
                {uploadMode === 'body' ? 'A IA vai analisar as métricas do relatório OKOK.' : 'A IA vai extrair os exercícios para você revisar antes de salvar.'}
              </p>
            </div>
          </div>
        )}

        {/* Optional notes are only relevant for workout-sheet extraction. */}
        {uploadMode === 'workout' && <div>
          <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">
            Observações Adicionais para a IA (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: 'Esta é minha ficha de Treino B (Costas e Bíceps)'"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>}

        {/* Process Button */}
        {uploadMode === 'body' && (
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-300">Contexto opcional</label>
            <textarea value={bodyContext} onChange={(e) => setBodyContext(e.target.value)} rows={3}
              placeholder="Ex.: objetivo de ganhar massa, frequência de treino, restrições ou dúvidas..."
              className="w-full rounded-xl bg-[#0A0A0A] border border-white/15 px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-white focus:outline-none" />
          </div>
        )}
        <button
          onClick={uploadMode === 'body' ? handleAnalyzeBodyReport : handleProcessSheet}
          disabled={!selectedFile || isProcessing}
          className="foco-v4-action !w-full !rounded-2xl disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isProcessing ? 'Analisando arquivo...' : uploadMode === 'body' ? 'Gerar relatório do perfil corporal' : 'Extrair exercícios com IA'}</span>
        </button>
      </section>
      )}

      {displayedBodyReport && uploadMode === 'body' && (
        <div className="space-y-4 animate-in fade-in">
          <section className="foco-v4-panel p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="foco-v4-section-title">Seus principais indicadores</h2>
              <span className="text-[11px] text-neutral-400">{displayedBodyReport.metrics.length} métricas</span>
            </div>
            <div className="foco-v4-evaluation-grid">
              {displayedBodyReport.metrics.map((metric,index) => <article key={metric.name + index} className="foco-v4-data-tile">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-neutral-300">{metric.name}</span>
                  <Activity className="h-4 w-4 shrink-0 text-neutral-400" />
                </div>
                <strong className="block break-words">{metric.value}</strong>
                <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-400">{metric.interpretation}</p>
              </article>)}
            </div>
          </section>
          <section className="foco-v4-panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="foco-v4-section-title">Análise inteligente FOCO</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">{displayedBodyReport.summary}</p>
          </section>
          {([['Pontos positivos', displayedBodyReport.strengths], ['Pontos de atenção', displayedBodyReport.attention_points], ['Orientações para o treino', displayedBodyReport.training_recommendations], ['Temas para discutir com nutricionista', displayedBodyReport.nutrition_discussion], ['Perguntas para o profissional', displayedBodyReport.questions_for_professional]] as [string, string[]][]).map(([title, items]) => <section key={title} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <h4 className="text-xs font-black uppercase tracking-wider">{title}</h4><ul className="mt-3 space-y-2">{items.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-relaxed text-neutral-300"><span className="text-neutral-500">•</span><span>{item}</span></li>)}</ul>
          </section>)}
          <p className="rounded-xl border border-white/10 p-4 text-[11px] leading-relaxed text-neutral-400">Limitações: {displayedBodyReport.limitations} A bioimpedância é uma estimativa, não um diagnóstico; confirme interpretações com profissional de saúde.</p>
        </div>
      )}
      {displayedBodyReport && uploadMode === 'body' && (
        <>
          <div className="foco-v4-panel flex items-center gap-3 p-4">
            <CalendarDays className="h-6 w-6 shrink-0 text-neutral-300" />
            <div className="flex-1">
              <h3 className="text-sm font-extrabold">Última avaliação</h3>
              <p className="mt-1 text-xs text-neutral-400">{lastBodyDate ? lastBodyDate.toLocaleDateString('pt-BR') : 'Analisada agora'}{daysSinceBody !== null ? ' · há ' + daysSinceBody + ' dias' : ''}. Recomendamos atualizar a cada 15 dias.</p>
            </div>
          </div>
          <button type="button" onClick={() => setActiveTab('novo-treino')}
            className="foco-v4-action w-full">
            Usar na criação da ficha <ChevronRight className="h-4 w-4" />
          </button>
          <p className="text-center text-[11px] text-neutral-400">O uso dos indicadores na criação da ficha exige sua autorização na próxima etapa.</p>
        </>
      )}
      {/* Extracted Data Confirmation Box */}
      {extractedResult && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/30 space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                <span>Leitura Concluída</span>
                <span>·</span>
                <span>{extractedResult.extracted_exercises.length} Exercícios</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase mt-0.5">
                {extractedResult.plan_name}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {extractedResult.confidence_notes}
              </p>
            </div>

            <button
              onClick={handleConfirmAndSavePlan}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovar e Salvar Ficha</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-neutral-500 font-bold border-b border-white/10 uppercase text-[10px]">
                  <th className="py-2 px-2">EXERCÍCIO</th>
                  <th className="py-2 px-2">GRUPAMENTO</th>
                  <th className="py-2 px-2">SÉRIES</th>
                  <th className="py-2 px-2">REPETIÇÕES</th>
                  <th className="py-2 px-2">CARGA (KG)</th>
                  <th className="py-2 px-2">DESCANSO</th>
                  <th className="py-2 px-2">NOTAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {extractedResult.extracted_exercises.map((ex, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="py-2.5 px-2 font-sans font-bold text-white">
                      {ex.exercise_name}
                    </td>
                    <td className="py-2.5 px-2 font-sans text-neutral-400">
                      {ex.muscle_group}
                    </td>
                    <td className="py-2.5 px-2 text-white font-black">
                      {ex.sets}
                    </td>
                    <td className="py-2.5 px-2 text-neutral-300">
                      {ex.reps_min}-{ex.reps_max}
                    </td>
                    <td className="py-2.5 px-2 text-white font-bold">
                      {ex.suggested_load_kg || '--'}
                    </td>
                    <td className="py-2.5 px-2 text-neutral-400">
                      {ex.rest_seconds}s
                    </td>
                    <td className="py-2.5 px-2 font-sans text-neutral-400 truncate max-w-[150px]">
                      {ex.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uploaded History List */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Fichas e Documentos Enviados ({files.length})
        </h3>

        {files.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center font-mono">
            Nenhum arquivo enviado até o momento.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {files.map((file) => (
              <div key={file.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-neutral-400 flex items-center justify-center">
                    {file.mime_type.includes('pdf') ? (
                      <FileText className="w-4 h-4 text-white" />
                    ) : (
                      <Image className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">{file.filename}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      {new Date(file.created_at).toLocaleDateString('pt-BR')} · {file.processing_status === 'processed' ? 'Original salvo · Processado' : file.processing_status === 'failed' ? 'Original salvo · Análise falhou' : file.processing_status === 'processing' ? 'Processando arquivo' : 'Arquivo salvo · Aguardando análise'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {file.storage_path !== 'processed-data-only' && (
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1.5 text-neutral-500 hover:text-white rounded transition-colors cursor-pointer"
                      title="Abrir original (link seguro temporário)"
                      aria-label={`Abrir arquivo ${file.filename}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1.5 text-neutral-500 hover:text-white rounded transition-colors cursor-pointer"
                    title="Excluir Arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
