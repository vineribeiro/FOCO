import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCheck, ChevronLeft, ChevronRight, ClipboardCheck, FileArchive, ImageOff, Layers3, LoaderCircle, Search, ShieldAlert, X } from 'lucide-react';
import { AnatomyEntry, loadAnatomyManifest } from '../data/anatomyAssets';
import { importAnatomyReviewPackage, ReviewSample } from '../utils/anatomyReviewZip';
import { AccessibleDialog } from '../components/AccessibleDialog';

interface AtlasPageProps {
  setActiveTab: (tab: string) => void;
}
interface PublicReviewSample {
  id: string;
  title: string;
  status: 'rejected' | 'needs_review';
  image: string | null;
  note: string;
  resolution?: string | null;
}
type StatusFilter = 'all' | AnatomyEntry['status'];
interface AtlasItem extends AnatomyEntry {
  source?: string;
  group?: string;
  primary_muscles?: string[];
  secondary_muscles?: string[];
  equipment?: string[];
}
const STATUS_NAME: Record<AnatomyEntry['status'], string> = {
  pending: 'Pendente',
  needs_review: 'Em revisão',
  approved: 'Aprovada',
  rejected: 'Reprovada',
};
const GROUP_NAMES: Record<string, string> = {
  '01_peito.json': 'Peito', '02_costas.json': 'Costas', '03_ombros.json': 'Ombros',
  '04_biceps.json': 'Bíceps', '05_triceps.json': 'Tríceps', '06_antebracos.json': 'Antebraços',
  '07_quadriceps.json': 'Quadríceps', '08_posteriores.json': 'Posteriores',
  '09_gluteos.json': 'Glúteos', '10_panturrilhas.json': 'Panturrilhas',
  '11_abdomen.json': 'Abdômen', '12_lombar.json': 'Lombar',
  '13_trapezio.json': 'Trapézio', '14_adutores_abdutores.json': 'Adutores e abdutores',
  '15_funcionais_e_cardio.json': 'Funcionais e cardio',
};
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export const AnatomyStudioPage: React.FC<AtlasPageProps> = ({ setActiveTab }) => {
  const [items, setItems] = useState<AtlasItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(36);
  const [samples, setSamples] = useState<ReviewSample[]>([]);
  const [publishedSamples, setPublishedSamples] = useState<PublicReviewSample[]>([]);
  const [publishedError, setPublishedError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ReviewSample | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadedUrls = useRef<string[]>([]);

  useEffect(() => {
    let active = true;
    loadAnatomyManifest().then(data => {
      if (!active) return;
      setItems(Object.values(data.exercises) as AtlasItem[]);
      setBusy(false);
    }).catch(() => {
      if (!active) return;
      setError('Não foi possível carregar o catálogo de imagens anatômicas.');
      setBusy(false);
    });
    return () => {
      active = false;
      for (const url of uploadedUrls.current) URL.revokeObjectURL(url);
      uploadedUrls.current = [];
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(import.meta.env.BASE_URL + 'anatomy/review/previews.json')
      .then(async response => {
        if (!response.ok) throw new Error('Não foi possível carregar as pranchas publicadas.');
        const manifest = await response.json();
        if (manifest.schema_version !== 1 || !Array.isArray(manifest.previews)) throw new Error('Formato do catálogo de prévias inválido.');
        return manifest.previews as PublicReviewSample[];
      })
      .then(previews => { if (alive) setPublishedSamples(previews); })
      .catch(err => { if (alive) setPublishedError(err instanceof Error ? err.message : 'Prévias indisponíveis.'); });
    return () => { alive = false; };
  }, []);

  const openPublishedSample = (sample: PublicReviewSample) => {
    if (!sample.image || !/^anatomy\/review\/[a-z0-9_.-]+\.(?:avif|webp|png|jpg)$/.test(sample.image)) return;
    setPreview({
      filename: sample.id,
      url: import.meta.env.BASE_URL + sample.image,
      status: sample.status,
      subject: sample.title,
      note: sample.note + (sample.resolution ? ' · Prévia publicada: ' + sample.resolution : ''),
    });
  };

  const counts = useMemo(() => {
    const result = { pending: 0, needs_review: 0, approved: 0, rejected: 0 };
    for (const item of items) if (item.status in result) result[item.status] += 1;
    return result;
  }, [items]);
  const results = useMemo(() => items.filter(item => {
    const term = normalize(search.trim());
    const searchable = normalize([item.id, item.name, ...(item.equipment || []), ...(item.primary_muscles || [])].join(' '));
    return (group === 'all' || item.source === group)
      && (statusFilter === 'all' || item.status === statusFilter)
      && (!term || searchable.includes(term));
  }), [items, search, group, statusFilter]);

  useEffect(() => { setVisibleCount(36); }, [search, group, statusFilter]);

  const onPackageSelected = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const newSamples = await importAnatomyReviewPackage(file);
      for (const url of uploadedUrls.current) URL.revokeObjectURL(url);
      uploadedUrls.current = newSamples.map(sample => sample.url);
      setSamples(newSamples);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o pacote.');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const clearSamples = () => {
    setPreview(null);
    for (const url of uploadedUrls.current) URL.revokeObjectURL(url);
    uploadedUrls.current = [];
    setSamples([]);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-28 text-white">
      <header className="space-y-4">
        <button type="button" onClick={() => setActiveTab('biblioteca')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar à biblioteca
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="foco-eyebrow">FOCO · Anatomy Engine v3</p>
            <h1 className="foco-page-title mt-2">Atlas de exercícios</h1>
            <p className="foco-muted mt-3 max-w-2xl">
              Acompanhe a produção das pranchas 3D e confira estudos visuais separadamente das imagens usadas durante o treino.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#171717]">
            <Layers3 className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
        </div>
      </header>

      <section aria-label="Andamento da biblioteca anatômica" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Exercícios mapeados', number: items.length, icon: BookOpen },
          { label: 'Pranchas aprovadas', number: counts.approved, icon: CheckCheck },
          { label: 'Em revisão', number: counts.needs_review, icon: ClipboardCheck },
          { label: 'Aguardando produção', number: counts.pending, icon: Layers3 },
        ].map(metric => (
          <div key={metric.label} className="foco-panel flex min-h-32 flex-col justify-between p-4 sm:p-5">
            <metric.icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            <div>
              <strong className="foco-stat mt-3 block text-3xl">{busy ? '—' : metric.number}</strong>
              <p className="mt-1 text-xs font-medium text-neutral-400">{metric.label}</p>
            </div>
          </div>
        ))}
      </section>

      {!busy && items.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Pranchas 3D aprovadas</span><strong className="text-neutral-200">{counts.approved} de {items.length}</strong>
          </div>
          <div role="progressbar" aria-label="Pranchas aprovadas" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={counts.approved}
            className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-white" style={{ width: (counts.approved / items.length * 100) + '%' }} />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-white/20 bg-[#1A1A1A] p-4 sm:p-5" aria-label="Política de revisão">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-neutral-200" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-base font-bold">Material em desenvolvimento</h2>
            <p className="text-sm leading-6 text-neutral-300">
              Os arquivos gerados anteriormente apresentaram exercícios repetidos e divergências na execução. Nenhum foi aprovado como guia anatômico.
              Imagens experimentais só aparecem nesta área de revisão; as fichas de treino continuam utilizando suas referências existentes até a aprovação.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="foco-public-review-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="foco-eyebrow">Acervo publicado · Apenas revisão visual</p>
            <h2 id="foco-public-review-heading" className="foco-section-title mt-2">Estudos visuais do FOCO</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Os estudos aqui são públicos, mas não foram aprovados para ensinar a execução.
              Não entram nas fichas e não substituem as fotografias de referência.
            </p>
          </div>
          <span className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-neutral-300">
            {publishedSamples.filter(item => Boolean(item.image)).length} de {publishedSamples.length || 3} prévias online
          </span>
        </div>
        {publishedError && <p role="alert" className="text-sm text-neutral-400">{publishedError}</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publishedSamples.map(item => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-white/20 bg-[#161616]">
              <button type="button" disabled={!item.image} onClick={() => openPublishedSample(item)}
                className="relative block aspect-[3/2] w-full overflow-hidden bg-[#F1F1F1] text-center disabled:cursor-default"
                aria-label={item.image ? 'Ampliar estudo não aprovado: ' + item.title : 'Imagem completa disponível pelo pacote de revisão'}>
                {item.image ? (
                  <img loading="lazy" src={import.meta.env.BASE_URL + item.image}
                    alt={'Estudo anatômico não validado: ' + item.title} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-neutral-500">
                    <ImageOff className="h-8 w-8" aria-hidden="true" />
                    <span className="text-sm font-semibold">Somente no pacote original</span>
                  </div>
                )}
                <span className="absolute bottom-3 left-3 rounded-lg bg-black/90 px-3 py-2 text-xs font-bold text-white">
                  {item.status === 'rejected' ? 'REPROVADA' : 'NÃO VALIDADA'}
                </span>
              </button>
              <div className="space-y-2 p-4">
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="text-sm leading-6 text-neutral-400">{item.note}</p>
                {item.image && <button type="button" onClick={() => openPublishedSample(item)}
                  className="min-h-11 rounded-xl border border-white/20 px-3 text-sm font-semibold hover:bg-white/10">
                  Ampliar prévia publicada
                </button>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="foco-review-samples-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="foco-eyebrow">Importação local · sem servidor</p>
            <h2 id="foco-review-samples-heading" className="foco-section-title mt-2">Artes do pacote de revisão</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Abra as três imagens originais em resolução integral no teu navegador.
              Essa importação é local e não altera o acervo público nem aprova os exercícios.
            </p>
          </div>
          <label className="foco-action relative cursor-pointer">
            {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            {importing ? 'Importando...' : 'Importar pacote ZIP'}
            <input ref={fileInput} type="file" accept=".zip,application/zip" disabled={importing}
              aria-label="Selecionar ZIP de revisão anatômica"
              onChange={event => { void onPackageSelected(event.target.files?.[0]); }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
        </div>
        {samples.length ? (
          <>
            <div className="flex items-center justify-between">
              <p role="status" className="text-sm text-neutral-400">{samples.length} imagem(ns) carregada(s) apenas para conferência.</p>
              <button type="button" onClick={clearSamples} className="foco-touch gap-2 rounded-xl border border-white/15 px-3 text-xs text-neutral-300 hover:bg-white/10">
                <X className="h-4 w-4" /> Limpar prévias
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {samples.map(sample => (
                <button type="button" key={sample.filename} onClick={() => setPreview(sample)}
                  className="overflow-hidden rounded-2xl border border-white/20 bg-[#161616] text-left transition hover:border-white/45 focus-visible:outline-offset-4">
                  <div className="relative aspect-[3/2] overflow-hidden bg-[#EEEEEE]">
                    <img src={sample.url} alt={'Estudo visual não aprovado: ' + sample.subject} loading="lazy" className="h-full w-full object-contain" />
                    <span className="absolute bottom-3 left-3 rounded-lg bg-black/90 px-3 py-2 text-xs font-bold text-white">
                      NÃO VALIDADA
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                      {sample.status === 'rejected' ? 'Reprovada' : 'Revisão necessária'}
                    </p>
                    <h3 className="text-base font-bold">{sample.subject}</h3>
                    <p className="text-sm leading-6 text-neutral-400">{sample.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.025] p-5 text-center">
            <ImageOff className="h-6 w-6 text-neutral-500" aria-hidden="true" />
            <p className="text-sm font-semibold">Nenhuma amostra carregada</p>
            <p className="text-xs leading-5 text-neutral-400">Importe FOCO_Anatomy_Pacote_Direto.zip para visualizar as artes não aprovadas.</p>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="foco-atlas-coverage-heading">
        <div className="space-y-2">
          <p className="foco-eyebrow">Planejamento completo</p>
          <h2 id="foco-atlas-coverage-heading" className="foco-section-title">254 exercícios catalogados</h2>
          <p className="text-sm text-neutral-400">O status vem do manifesto publicado no FOCO, e não das amostras importadas no navegador.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_230px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
            <input className="foco-field !pl-11" placeholder="Buscar nome, músculo ou equipamento..." value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar exercícios" />
          </div>
          <select className="foco-field" value={group} onChange={event => setGroup(event.target.value)} aria-label="Filtrar grupo muscular">
            <option value="all">Todos os grupos</option>
            {Object.entries(GROUP_NAMES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
          <select className="foco-field" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filtrar status">
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_NAME).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="rounded-xl border border-white/30 p-4 text-sm text-neutral-200">{error}</p>}
        {busy ? (
          <p className="flex items-center gap-2 text-sm text-neutral-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando atlas...</p>
        ) : (
          <>
            <p className="text-xs text-neutral-400">{results.length} resultado(s)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.slice(0, visibleCount).map(item => (
                <article key={item.id} className="foco-panel flex min-h-44 flex-col justify-between gap-3 p-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-400">{GROUP_NAMES[item.source || ''] || item.group || 'Exercício'}</span>
                      <span className={'rounded-full border px-2.5 py-1 text-[11px] font-semibold ' +
                        (item.status === 'approved' ? 'border-white/40 bg-white/10 text-white' : 'border-white/15 bg-black/30 text-neutral-400')}>
                        {STATUS_NAME[item.status]}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug">{item.name}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{(item.primary_muscles || []).join(' · ') || 'Músculos não especificados'}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                    <span className="truncate font-mono text-[10px] text-neutral-500">{item.id}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{item.status === 'approved' ? 'Liberado' : 'Não publicado'}</span>
                  </div>
                </article>
              ))}
            </div>
            {visibleCount < results.length && (
              <button type="button" onClick={() => setVisibleCount(count => count + 36)}
                className="foco-action w-full sm:w-auto">Mostrar mais {Math.min(36, results.length - visibleCount)} <ChevronRight className="h-4 w-4" /></button>
            )}
          </>
        )}
      </section>

      {preview && (
        <AccessibleDialog title={'Prévia não aprovada de ' + preview.subject} size="lg" onClose={() => setPreview(null)}>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-widest text-neutral-400">ARTE NÃO VALIDADA</p>
                <h2 className="mt-1 text-lg font-bold">{preview.subject}</h2></div>
              <button type="button" onClick={() => setPreview(null)} className="foco-touch rounded-xl bg-white/10" aria-label="Fechar prévia"><X className="h-5 w-5" /></button>
            </div>
            <img src={preview.url} alt="Estudo de design: não utilizar como guia de execução física"
              className="max-h-[65dvh] w-full rounded-xl bg-white object-contain" />
            <p className="text-sm leading-6 text-neutral-300">{preview.note}</p>
            <p className="text-xs text-neutral-400">Este material não substitui instruções de exercício nem constitui validação biomecânica.</p>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
};
