import React, { useState } from 'react';
import {
  FocoSymbol,
  FocoLogoHorizontal,
  FocoLogoVertical,
  FocoLettering,
  FOCO_PALETTE,
} from '../components/FocoBrand';
import {
  Copy,
  Check,
  Download,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Grid,
  Shield,
  Smartphone,
  Eye,
  Sliders,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface BrandIdentityPageProps {
  setActiveTab?: (tab: string) => void;
}

export const BrandIdentityPage: React.FC<BrandIdentityPageProps> = ({ setActiveTab }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<'board' | 'shaker' | 'shirt' | 'app' | 'leather'>('board');
  const [zoomBoard, setZoomBoard] = useState(false);

  const colors = [
    { name: 'Preto Profundo', hex: '#0A0A0A', rgb: '10, 10, 10', cmyk: '75, 68, 67, 90', role: 'Fundo primário, embalagens, tecidos técnicos' },
    { name: 'Grafite', hex: '#292929', rgb: '41, 41, 41', cmyk: '69, 63, 62, 58', role: 'Superfícies secundárias, cards, elevação' },
    { name: 'Cinza Médio', hex: '#858585', rgb: '133, 133, 133', cmyk: '48, 39, 39, 4', role: 'Metadados, divisores, linhas de grid' },
    { name: 'Cinza Claro', hex: '#E5E5E5', rgb: '229, 229, 229', cmyk: '9, 7, 7, 0', role: 'Fundos de alto contraste, etiquetas' },
    { name: 'Branco Puro', hex: '#FFFFFF', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0', role: 'Logotipo primário, tipografia principal' },
  ];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const svgCodeSnippet = `<svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Símbolo Monograma F - FOCO -->
  <path d="M 32 30 L 52 10 L 98 10 L 80 28 L 52 28 Z" fill="#FFFFFF"/>
  <path d="M 4 58 L 32 30 L 76 30 L 60 46 L 38 46 L 24 60 L 4 60 Z" fill="#FFFFFF"/>
</svg>`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-32 text-white">
      
      {/* Editorial Header */}
      <div className="border-b border-white/10 pb-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest uppercase text-neutral-300 mb-3">
              <span>Manual de Identidade Visual Oficial</span>
              <span>·</span>
              <span>v1.0 Monocromático</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-white font-sans">
              FOCO <span className="font-light text-neutral-400">| FITNESS PREMIUM</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl mt-1.5 leading-relaxed font-normal">
              Sistema de identidade visual para atletas de alta performance. Geometria angular, cortes aerodinâmicos, proporções rigorosas e paleta monocromática estrita.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopy(svgCodeSnippet, 'svg')}
              className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
            >
              {copiedCode === 'svg' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode === 'svg' ? 'SVG Copiado!' : 'Copiar SVG do Símbolo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: MASTER BRAND BOARD MOCKUP SHOWCASE */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-white" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              Prancha Oficial de Identidade Visual
            </h2>
          </div>
          <button
            onClick={() => setZoomBoard(!zoomBoard)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {zoomBoard ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{zoomBoard ? 'Visualização Normal' : 'Ampliar Prancha'}</span>
          </button>
        </div>

        {/* Board Image Container */}
        <div className={`overflow-hidden rounded-xl border border-white/10 bg-[#0F0F0F] transition-all ${zoomBoard ? 'scale-100' : ''}`}>
          <img
            src={`${import.meta.env.BASE_URL}assets/brand/foco_brand_board.png`}
            alt="Prancha de Identidade Visual FOCO Fitness Premium"
            className="w-full h-auto object-cover rounded-xl"
            onError={(e) => {
              // Fallback to media storage path if needed
              const target = e.target as HTMLImageElement;
              target.src = `${import.meta.env.BASE_URL}assets/brand/media_1793034395682_bc136f36.png`; 
            }}
          />
        </div>
        <p className="text-[11px] text-neutral-400 font-mono text-center">
          Prancha mestra com símbolo geométrico angular, proporções da malha construtiva, versões horizontal/vertical, ícone app e mockups em coqueteleira e vestuário esportivo.
        </p>
      </div>

      {/* SECTION 2: O SÍMBOLO & CONSTRUÇÃO GEOMÉTRICA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Monogram Detail & Geometry */}
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              01 · Símbolo Autoral
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white">
              Ângulo de Ataque 35°
            </span>
          </div>

          {/* Large Symbol Showcase */}
          <div className="h-48 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-white/5 flex items-center justify-center p-6 relative overflow-hidden group">
            {/* Subtle background technical grid lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]" />
            <FocoSymbol className="w-28 h-28 text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-105" />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              Monograma Geométrico "F"
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Inspirado no vetor de propulsão e na superação biomecânica. É composto por duas lâminas dinâmicas paralelas com cortes em chanfro de 35°.
            </p>
            <ul className="text-[11px] text-neutral-400 space-y-1 font-mono pt-1">
              <li>• Ausência de clichês (sem halteres, sem figuras humanas, sem alvos).</li>
              <li>• Espaçamento negativo constante entre as lâminas de ataque.</li>
              <li>• Vértice superior afunilado para sugerir velocidade e disciplina.</li>
            </ul>
          </div>
        </div>

        {/* Lettering & Slogan */}
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              02 · Lettering & Slogan
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white">
              Caixa Alta · Extended
            </span>
          </div>

          {/* Lettering Showcase */}
          <div className="h-48 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-white/5 flex flex-col items-center justify-center p-6 text-center">
            <FocoLettering className="h-9 w-auto text-white max-w-full" />
            <span className="text-[10px] font-bold tracking-[0.34em] text-neutral-400 uppercase mt-4">
              FOCO EM EVOLUIR.
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              Construção Tipográfica Exclusiva
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              O lettering <strong className="text-white">FOCO</strong> adota proporções retangulares com cantos suavizados (squircle), espessura pesada (font-black) e abertura generosa nos caracteres, garantindo presença e leitura instantânea em qualquer distância.
            </p>
            <p className="text-[11px] text-neutral-500 font-mono">
              Slogan Oficial: "FOCO EM EVOLUIR." aplicado em caixa alta com espaçamento largo (tracking 0.3em).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: ASSINATURAS DA MARCA (HORIZONTAL, VERTICAL, SÍMBOLO ISOLADO) */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-6">
        <div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            03 · Sistema de Assinaturas
          </span>
          <h2 className="text-base font-black uppercase text-white mt-0.5">
            Versões Oficiais e Aplicações em Alto Contraste
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Assinatura Horizontal (Fundo Preto) */}
          <div className="p-5 rounded-xl bg-[#000000] border border-white/10 flex flex-col items-center justify-between min-h-[200px] text-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase self-start">
              Assinatura Horizontal (Primária)
            </span>
            <div className="my-auto py-4">
              <FocoLogoHorizontal symbolSize="w-10 h-10" showSlogan={false} />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Uso em headers, navegações e patrocínios
            </span>
          </div>

          {/* Assinatura Vertical (Fundo Cinza Escuro) */}
          <div className="p-5 rounded-xl bg-[#161616] border border-white/10 flex flex-col items-center justify-between min-h-[200px] text-center">
            <span className="text-[10px] font-mono text-neutral-400 uppercase self-start">
              Assinatura Vertical (Oficial)
            </span>
            <div className="my-auto py-2">
              <FocoLogoVertical symbolSize="w-14 h-11" showSlogan={true} />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Uso em cartazes, capas e packaging
            </span>
          </div>

          {/* Assinatura Positiva (Fundo Branco #FFFFFF) */}
          <div className="p-5 rounded-xl bg-[#FFFFFF] text-black border border-neutral-300 flex flex-col items-center justify-between min-h-[200px] text-center">
            <span className="text-[10px] font-mono text-neutral-600 uppercase self-start">
              Versão Positiva (Fundo Claro)
            </span>
            <div className="my-auto py-2">
              <FocoLogoVertical
                symbolSize="w-14 h-11"
                symbolColor="#0A0A0A"
                textColor="text-black"
                showSlogan={true}
              />
            </div>
            <span className="text-[10px] text-neutral-600 font-mono">
              Uso em documentos impressos e etiquetas
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: PALETA CROMÁTICA MONOCROMÁTICA RESTRITA */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-6">
        <div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            04 · Sistema Cromático Restrito
          </span>
          <h2 className="text-base font-black uppercase text-white mt-0.5">
            Paleta Monocromática Oficial FOCO
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Exclusivamente tons de preto, grafite, cinza e branco. Clique em qualquer amostra para copiar o código hexadecimal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {colors.map((c) => (
            <div
              key={c.hex}
              onClick={() => handleCopy(c.hex, c.hex)}
              className="p-3.5 rounded-xl border border-white/10 bg-[#141414] hover:border-white/30 transition-all cursor-pointer group"
            >
              {/* Color swatch swatch box */}
              <div
                className="w-full h-24 rounded-lg mb-3 border border-white/10 transition-transform group-hover:scale-[1.02]"
                style={{ backgroundColor: c.hex }}
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-white">{c.name}</span>
                  {copiedCode === c.hex ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <p className="font-mono text-xs font-bold text-white tracking-wider">{c.hex}</p>
                <p className="font-mono text-[10px] text-neutral-400">RGB: {c.rgb}</p>
                <p className="font-mono text-[10px] text-neutral-400">CMYK: {c.cmyk}</p>
                <p className="text-[10px] text-neutral-400 pt-1 line-clamp-2 leading-tight">
                  {c.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: ESCALA DE REDUÇÃO & LEGIBILIDADE (FAVICON, BORDADO, APP) */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-6">
        <div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
            05 · Redução & Responsividade do Símbolo
          </span>
          <h2 className="text-base font-black uppercase text-white mt-0.5">
            Comportamento em Micro e Macro Escalas
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            O desenho geométrico angular permanece 100% nítido e reconhecível em avatares, favicons, bordados de vestuário e sinalização esportiva.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          
          {/* 64px */}
          <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col items-center justify-between h-44 text-center">
            <span className="text-[10px] font-mono text-neutral-400">64 × 64 px</span>
            <div className="w-16 h-16 rounded-xl bg-black border border-white/10 flex items-center justify-center">
              <FocoSymbol className="w-10 h-10 text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Avatar de Rede</span>
          </div>

          {/* 32px */}
          <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col items-center justify-between h-44 text-center">
            <span className="text-[10px] font-mono text-neutral-400">32 × 32 px</span>
            <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center">
              <FocoSymbol className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Favicon / App Tab</span>
          </div>

          {/* 24px */}
          <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col items-center justify-between h-44 text-center">
            <span className="text-[10px] font-mono text-neutral-400">24 × 24 px</span>
            <div className="w-8 h-8 rounded bg-black border border-white/10 flex items-center justify-center">
              <FocoSymbol className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Bordado Têxtil</span>
          </div>

          {/* 16px */}
          <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col items-center justify-between h-44 text-center">
            <span className="text-[10px] font-mono text-neutral-400">16 × 16 px</span>
            <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center">
              <FocoSymbol className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Ícone Mínimo</span>
          </div>
        </div>
      </div>

      {/* SECTION 6: APLICAÇÕES COMPLEMENTARES INTERATIVAS (MOCKUPS DO SEGMENTO FITNESS) */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              06 · Aplicações & Mockups Físicos
            </span>
            <h2 className="text-base font-black uppercase text-white mt-0.5">
              Ecossistema de Produto Fitness
            </h2>
          </div>

          {/* Segmented controls for mockups */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141414] border border-white/10 overflow-x-auto">
            <button
              onClick={() => setSelectedMockup('shaker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedMockup === 'shaker'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Coqueteleira
            </button>
            <button
              onClick={() => setSelectedMockup('shirt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedMockup === 'shirt'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Camiseta Dry-Fit
            </button>
            <button
              onClick={() => setSelectedMockup('app')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedMockup === 'app'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Ícone de App
            </button>
            <button
              onClick={() => setSelectedMockup('leather')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedMockup === 'leather'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Relevo / Debossed
            </button>
          </div>
        </div>

        {/* Dynamic Mockup Stage */}
        <div className="min-h-[300px] rounded-xl bg-[#050505] border border-white/10 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          
          {selectedMockup === 'shaker' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="w-32 h-64 rounded-3xl bg-gradient-to-b from-[#181818] via-[#0F0F0F] to-[#0A0A0A] border border-white/10 shadow-2xl relative flex flex-col items-center justify-center p-3">
                {/* Shaker Cap */}
                <div className="w-24 h-8 bg-[#252525] rounded-t-xl border-t border-x border-white/20 absolute -top-4 shadow-md flex items-center justify-center">
                  <div className="w-6 h-2 bg-black rounded-full" />
                </div>
                {/* Brand Logo on shaker */}
                <div className="text-center space-y-2 mt-4">
                  <FocoSymbol className="w-12 h-12 text-white mx-auto drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
                  <span className="font-black text-sm tracking-[0.2em] uppercase text-white block">
                    FOCO
                  </span>
                </div>
                {/* Ounces graduation marks */}
                <div className="absolute right-2 top-20 bottom-12 flex flex-col justify-between text-[7px] font-mono text-neutral-600">
                  <span>700ml</span>
                  <span>500ml</span>
                  <span>300ml</span>
                  <span>100ml</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-mono text-center">
                Coqueteleira fosca Matte Black 750ml com serigrafia em titânio branco de alta durabilidade.
              </p>
            </div>
          )}

          {selectedMockup === 'shirt' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="w-64 h-56 rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] border border-white/10 shadow-2xl relative p-6 flex flex-col justify-between overflow-hidden">
                {/* Collar seam */}
                <div className="w-24 h-6 border-b border-white/20 rounded-b-full mx-auto" />
                {/* Left Chest Print */}
                <div className="self-end mr-6 mb-8 text-center">
                  <FocoSymbol className="w-7 h-7 text-white drop-shadow" />
                </div>
                <div className="text-[9px] font-mono text-neutral-400 text-center uppercase tracking-widest">
                  Tecido Dry-Fit AeroPro · Antimicrobiano
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-mono text-center">
                Camiseta técnica esportiva preta com termocolante emborrachado discreto no peitoral esquerdo.
              </p>
            </div>
          )}

          {selectedMockup === 'app' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="w-28 h-28 rounded-[28px] bg-[#0A0A0A] border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center relative group">
                <div className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-white/0 via-white/5 to-white/10" />
                <FocoSymbol className="w-16 h-16 text-white drop-shadow-[0_4px_16px_rgba(255,255,255,0.2)]" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white uppercase tracking-wider">FOCO Athlete Pro</p>
                <p className="text-[10px] text-neutral-400 font-mono">Ícone de Sistema iOS & Android (Squircle 512px)</p>
              </div>
            </div>
          )}

          {selectedMockup === 'leather' && (
            <div className="flex flex-col items-center space-y-4 animate-in fade-in">
              <div className="w-72 h-44 rounded-2xl bg-[#0D0D0D] border border-white/5 shadow-2xl flex items-center justify-center p-6 relative overflow-hidden">
                {/* Texture overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:6px_6px]" />
                <div className="text-center space-y-1">
                  <FocoSymbol className="w-16 h-16 text-neutral-600 drop-shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="font-black text-xs tracking-[0.25em] text-neutral-600 block uppercase">
                    FOCO
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-mono text-center">
                Gravação em baixo relevo (debossed) em estojo de couro esportivo e acessórios de academia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK LAUNCH TO WORKOUT DASHBOARD */}
      {setActiveTab && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider">
              Experimente a Experiência no App
            </h4>
            <p className="text-xs text-neutral-400">
              Acesse a ficha de treino diária com animação 3D do boneco anatômico e controle de repetições.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 shadow-md"
          >
            <span>Ir para o Dashboard de Treino</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
