# FOCO Mobile - Interface Maximalista Monocromática (Preto, Cinza & Branco)

O **FOCO** receberá uma reformulação estética completa para uma paleta **estritamente monocromática** (preto absoluto OLED, todas as gradações de cinza grafite, chumbo, prata e branco puro de altíssimo contraste), eliminando todas as cores residuais (vermelho, carmesim, verde volt, azul). O boneco 3D interativo em Three.js terá iluminação anatômica em **platina e branco emissivo brilhante**, e a arquitetura móvel receberá uma revisão rigorosa de cálculo de viewport e paddings de segurança (`pb-32`, hitboxes de 44px e contenção de z-index) para garantir que **absolutamente nenhum elemento se sobreponha** ou fique inacessível atrás da barra de navegação inferior.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Diretrizes confirmadas para a versão monocromática e mobile:

- **Paleta Monocromática Pura**: 
  - Fundo principal: `#000000` (Preto absoluto OLED).
  - Superfícies e Cards: `#0D0F12` e `#14171D` com contornos sutis `#262B35` e `#333945`.
  - Destaques, Ícones Ativos e Botões Primários: `#FFFFFF` com texto em preto `#000000` ou bordas prateadas `#E2E8F0`.
  - Textos secundários e metadados: Gradações de cinza `#64748B`, `#94A3B8` e `#CBD5E1`.
- **Boneco 3D em Platina & Grafite**:
  - Manequim modelado em cinza grafite fosco (`#181B22`).
  - Músculos agonistas e equipamentos iluminados em **branco puro fluorescente (`#FFFFFF`) e platina emissiva**, com reflexos metálicos prateados de alta definição.
  - Grid de chão e iluminação de estúdio Three.js em tons neutros de luz fria branca e sombras suaves.
- **Engenharia Anti-Sobreposição Mobile**:
  - Eliminação de conflitos entre a barra inferior fixa (*Fixed Bottom Tab Bar*) e o final das listas e botões de ação: todos os containers de página terão padding inferior explícito `pb-32` (`8rem`), garantindo que o último card ou botão termine bem acima da barra.
  - Botão de "INICIAR TREINO" integrado de forma natural ao fluxo de rolagem sem sobrepor cards de exercícios.
  - Modais (incluindo o visualizador 3D) isolados em stacking context superior (`z-50`) com backdrop escuro opaco e rolagem interna contida.

---

### 1. Overview & Core Concept

- **Aparência & Identidade**: Um aplicativo esportivo sofisticado, brutalista e maximalista, que remete aos melhores designs editoriais e de equipamentos de precisão de musculação.
- **Usabilidade no Celular**: Operação com uma mão sem atrito, contraste perfeito sob luz forte de academias e sem qualquer sobreposição de textos, abas ou botões.

---

### 2. User Experience & Visual Design (Monochrome Fitbod)

- **Hierarquia Visual**:
  - Tipografia Maximalista: `font-black text-white` (peso 900) para nomes de exercícios e números principais, contrastando com `font-medium text-neutral-400` para repetições e séries.
  - Badges e Controles: Pílulas e botões em preto fosco com bordas brancas ou brancos sólidos com ícones em preto puro.
  - Gráficos no Banco de Dados: Curvas e barras em branco e gradientes de cinza prateado de alta legibilidade.
  - Carrossel de Músculos Alvo: Ícones anatômicos monocromáticos com porcentagens em branco puro (`100%`, `80%`, `60%`).

---

### 3. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│               FOCO MOBILE - ARQUITETURA MONOCROMÁTICA                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Header Mobile Fixo: Preto OLED (#000) · Borda Sutil (#262B35)    │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Scroll Viewport Central (Padding de Segurança Inferior: pb-32)    │  │
│  │                                                                  │  │
│  │  • Músculos Alvo (Carrossel Monocromático)                       │  │
│  │  • Linha Guia Vertical Conectando Exercícios                     │  │
│  │  • Cards de Treino com Badges em Branco e Cinza                  │  │
│  │  • Botão Primário "INICIAR TREINO" (Branco Sólido #FFF / #000)   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Three.js 3D Viewport: Manequim Grafite + Músculos Platina/Branco │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Fixed Bottom Navigation Bar (Fundo Preto #000 · Ícones Brancos)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---
