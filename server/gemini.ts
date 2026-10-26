import { GoogleGenAI } from '@google/genai';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
}

export interface GeneratedExercise {
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  suggested_load_kg: number;
  notes: string;
}

export interface GeneratedPlan {
  name: string;
  goal: string;
  weekly_frequency: number;
  explanation: string;
  exercises: GeneratedExercise[];
}

export interface ProgressionReviewResult {
  review_interval_days: number;
  explanation: string;
  progression_summary: {
    strength_delta: string;
    volume_analysis: string;
    focus_adjustments: string;
  };
  proposed_plan: {
    name: string;
    goal: string;
    weekly_frequency: number;
    exercises: GeneratedExercise[];
  };
}

// 1. Gerador Inteligente de Treinos
export async function generateAiWorkout(params: {
  goal: string;
  experience_level: string;
  weekly_frequency: number;
  focus_muscles?: string;
  equipment_available?: string;
  restrictions?: string;
  current_weight_kg?: number;
}): Promise<GeneratedPlan> {
  const ai = getAiClient();
  const prompt = `Você é o treinador principal e fisiologista do aplicativo FOCO de musculação de alta performance.
Crie uma ficha de treino completa, equilibrada e altamente eficaz para o seguinte perfil de aluno:
- Objetivo principal: ${params.goal}
- Nível de experiência: ${params.experience_level}
- Frequência semanal: ${params.weekly_frequency} dias na semana
- Músculos prioritários: ${params.focus_muscles || 'Corpo inteiro / Equilíbrio'}
- Equipamentos disponíveis: ${params.equipment_available || 'Academia completa'}
- Restrições/Lesões: ${params.restrictions || 'Nenhuma restrição'}
- Peso atual: ${params.current_weight_kg ? params.current_weight_kg + 'kg' : 'Não informado'}

Instruções técnicas obrigatórias:
1. Monte um plano de exercícios biomecanicamente otimizado para a frequência semanal informada.
2. Os grupos selecionados como prioritários devem receber mais volume semanal direto que os grupos secundários, sem negligenciar o corpo inteiro e respeitando a recuperação. Se glúteos, quadríceps, posteriores ou panturrilhas estiverem selecionados, distribua estímulos adequados para inferiores ao longo da semana, evitando concentrar todo o volume em um único dia.
3. Não presuma sexo, gênero ou preferência estética; siga os grupos escolhidos, o objetivo, a experiência e as restrições informadas. O FOCO atende pessoas de qualquer gênero.
4. Cada exercício DEVE conter: nome exato em português, grupamento muscular ('Peito', 'Costas', 'Quadríceps', 'Posterior de Coxa', 'Ombros', 'Tríceps', 'Bíceps', 'Abdômen', etc.), número de séries, repetições mínimas e máximas, tempo de descanso em segundos (ex: 60, 90, 120) e carga inicial sugerida em kg compatível com o nível.
5. Responda ESTRITAMENTE em formato JSON compatível com a estrutura requerida.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          goal: { type: 'STRING' },
          weekly_frequency: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exercise_name: { type: 'STRING' },
                muscle_group: { type: 'STRING' },
                sets: { type: 'INTEGER' },
                reps_min: { type: 'INTEGER' },
                reps_max: { type: 'INTEGER' },
                rest_seconds: { type: 'INTEGER' },
                suggested_load_kg: { type: 'NUMBER' },
                notes: { type: 'STRING' },
              },
              required: ['exercise_name', 'muscle_group', 'sets', 'reps_min', 'reps_max', 'rest_seconds', 'suggested_load_kg'],
            },
          },
        },
        required: ['name', 'goal', 'weekly_frequency', 'explanation', 'exercises'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text) as GeneratedPlan;
}

// 2. Leitura Multimodal e Extração de Fichas (Fotos e PDFs)
export async function extractWorkoutFromSheet(
  base64Data: string,
  mimeType: string,
  userNotes?: string
): Promise<{
  plan_name: string;
  goal: string;
  weekly_frequency: number;
  extracted_exercises: GeneratedExercise[];
  confidence_notes: string;
}> {
  const ai = getAiClient();
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

  const prompt = `Você é o leitor óptico e especialista em fichas de musculação do aplicativo FOCO.
Analise detalhadamente o arquivo enviado (pode ser foto de ficha de academia, impressão, tabela ou documento PDF).
Extraia todos os exercícios físicos listados, identificando:
- Nome do exercício
- Grupamento muscular correspondente
- Número de séries
- Repetições mínimas e máximas (se estiver escrito ex: '3x10', reps_min=10, reps_max=10)
- Intervalo de descanso em segundos (se não especificado na folha, deduza razoavelmente entre 60 e 90s)
- Carga sugerida em kg (se houver anotação de peso na ficha, extraia; senão coloque 0)
- Observações técnicas (métodos como drop-set, cadência, biset, etc. caso haja)

Observações do usuário sobre a ficha: ${userNotes || 'Nenhuma'}.

Responda ESTRITAMENTE em formato JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          plan_name: { type: 'STRING' },
          goal: { type: 'STRING' },
          weekly_frequency: { type: 'INTEGER' },
          confidence_notes: { type: 'STRING' },
          extracted_exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exercise_name: { type: 'STRING' },
                muscle_group: { type: 'STRING' },
                sets: { type: 'INTEGER' },
                reps_min: { type: 'INTEGER' },
                reps_max: { type: 'INTEGER' },
                rest_seconds: { type: 'INTEGER' },
                suggested_load_kg: { type: 'NUMBER' },
                notes: { type: 'STRING' },
              },
              required: ['exercise_name', 'muscle_group', 'sets', 'reps_min', 'reps_max', 'rest_seconds', 'suggested_load_kg'],
            },
          },
        },
        required: ['plan_name', 'extracted_exercises', 'confidence_notes'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text);
}

// 3. Revisão de Ciclo de 15 ou 30 Dias com Sobrecarga Progressiva
export async function reviewProgressionCycle(params: {
  current_plan: any;
  workout_sessions: any[];
  review_interval_days: number;
  user_feedback?: string;
}): Promise<ProgressionReviewResult> {
  const ai = getAiClient();
  const prompt = `Você é o fisiologista e cientista esportivo do aplicativo FOCO.
Realize a revisão de ciclo periódico de ${params.review_interval_days} dias do plano de treino atual do aluno.
Dados do plano atual:
${JSON.stringify(params.current_plan, null, 2)}

Histórico de sessões e séries executadas nos últimos ${params.review_interval_days} dias:
${JSON.stringify(params.workout_sessions.slice(0, 20), null, 2)}

Feedback do usuário: ${params.user_feedback || 'Sem queixas de dores articulares, buscando evolução de carga e densidade muscular.'}

Sua missão:
1. Avaliar a aderência, tonelagem total e evolução nas cargas.
2. Aplicar o princípio de Sobrecarga Progressiva (Progressive Overload):
   - Aumentar levemente as cargas nos exercícios principais (2% a 5% ou +1kg a +4kg).
   - Ajustar faixas de repetições ou adicionar variações de ângulos/exercícios onde houver acomodação biomecânica.
3. Explicar com clareza científica a razão de cada ajuste.
4. Entregar a proposta de novo plano com a lista completa de exercícios atualizados.

Responda ESTRITAMENTE em formato JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          review_interval_days: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          progression_summary: {
            type: 'OBJECT',
            properties: {
              strength_delta: { type: 'STRING' },
              volume_analysis: { type: 'STRING' },
              focus_adjustments: { type: 'STRING' },
            },
            required: ['strength_delta', 'volume_analysis', 'focus_adjustments'],
          },
          proposed_plan: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              goal: { type: 'STRING' },
              weekly_frequency: { type: 'INTEGER' },
              exercises: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    exercise_name: { type: 'STRING' },
                    muscle_group: { type: 'STRING' },
                    sets: { type: 'INTEGER' },
                    reps_min: { type: 'INTEGER' },
                    reps_max: { type: 'INTEGER' },
                    rest_seconds: { type: 'INTEGER' },
                    suggested_load_kg: { type: 'NUMBER' },
                    notes: { type: 'STRING' },
                  },
                  required: ['exercise_name', 'muscle_group', 'sets', 'reps_min', 'reps_max', 'rest_seconds', 'suggested_load_kg'],
                },
              },
            },
            required: ['name', 'goal', 'weekly_frequency', 'exercises'],
          },
        },
        required: ['review_interval_days', 'explanation', 'progression_summary', 'proposed_plan'],
      },
    },
  });

  const text = response.text?.trim() || '{}';
  return JSON.parse(text) as ProgressionReviewResult;
}


// 4. Análise orientativa de relatório de bioimpedância/metabolismo
export async function analyzeBioimpedanceReport(
  base64Data: string,
  mimeType: string,
  userContext?: string
): Promise<{
  summary: string;
  metrics: { name: string; value: string; interpretation: string }[];
  strengths: string[];
  attention_points: string[];
  training_recommendations: string[];
  nutrition_discussion: string[];
  questions_for_professional: string[];
  limitations: string;
}> {
  const ai = getAiClient();
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  const prompt = `Você é um assistente de educação em composição corporal do app FOCO. Leia o relatório de bioimpedância anexado e produza uma leitura cuidadosa em português do Brasil.
Contexto opcional informado pela pessoa: ${userContext || 'Não informado'}.
Regras obrigatórias:
- Extraia apenas números e métricas legíveis no documento; não invente valores. Se algo não estiver claro, omita a métrica ou diga que está ilegível.
- Explique em linguagem simples o que cada métrica significa e interprete com cautela, considerando que equações e faixas variam por aparelho, idade e sexo.
- Não diagnostique doenças nem prescreva dieta, calorias, suplementos ou tratamento.
- Separe achados observados de recomendações gerais. Não classifique uma pessoa como saudável/doente com base apenas no exame.
- Inclua limitações da bioimpedância (hidratação, refeição, exercício recente, horário e condições da medição afetam resultados).
- Sugira perguntas úteis para nutricionista/médico, e recomendações gerais de treino compatíveis com objetivos informados.
Responda estritamente no JSON conforme o schema.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [
      { inlineData: { data: cleanBase64, mimeType: mimeType || 'application/pdf' } },
      { text: prompt },
    ] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          metrics: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            name: { type: 'STRING' }, value: { type: 'STRING' }, interpretation: { type: 'STRING' },
          }, required: ['name', 'value', 'interpretation'] } },
          strengths: { type: 'ARRAY', items: { type: 'STRING' } },
          attention_points: { type: 'ARRAY', items: { type: 'STRING' } },
          training_recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
          nutrition_discussion: { type: 'ARRAY', items: { type: 'STRING' } },
          questions_for_professional: { type: 'ARRAY', items: { type: 'STRING' } },
          limitations: { type: 'STRING' },
        },
        required: ['summary', 'metrics', 'strengths', 'attention_points', 'training_recommendations', 'nutrition_discussion', 'questions_for_professional', 'limitations'],
      },
    },
  });
  return JSON.parse(response.text?.trim() || '{}');
}
