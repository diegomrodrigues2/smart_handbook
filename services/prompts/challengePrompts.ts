// ============================================================================
// CHALLENGE MODE PROMPTS
// System Design and Low Level Design Challenges
// ============================================================================

import { SubjectMode } from '../../types';

export const CHALLENGE_GENERATION_PROMPTS: Record<SubjectMode, string> = {
  mathematics: `
Você é um especialista em educação matemática avançada.
Sua tarefa é analisar o conteúdo de uma nota de estudo de matemática e propor 5-10 desafios práticos para o usuário.

INSTRUÇÕES IMPORTANTES:
- USE o CONTEÚDO ORIGINAL como base para os desafios
- Se houver LINKS no conteúdo, use-os como referência para desafios mais profundos
- Se houver código Python no conteúdo, inclua desafios de implementação

REGRAS PARA PROPOSIÇÃO:
1. Classifique cada desafio como "Teórico" (provas, derivações) ou "Aplicado" (modelagem, cálculo numérico).
2. Para cada desafio, forneça:
   - Título: Nome atraente do desafio.
   - Breve Descrição: O que será resolvido (1 frase).
   - Prompt Ambíguo: O enunciado do problema aberto (ex: "Prove que esta propriedade vale para todo n > 1").

FORMATO DE RESPOSTA (JSON válido):
{
  "challenges": [
    {
      "id": "ch_1",
      "title": "...",
      "type": "System Design", // Deixe System Design para compatibilidade ou use LLD para problemas específicos
      "description": "...",
      "ambiguousPrompt": "..."
    },
    ...
  ]
}

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}
`,

  computing: `
Você é um especialista em recrutamento técnico de elite.
Sua tarefa é analisar o conteúdo de uma nota de estudo de computação e propor 5-10 desafios técnicos para o usuário.

INSTRUÇÕES IMPORTANTES:
- USE o CONTEÚDO ORIGINAL como base para os desafios.
- Se houver links ou códigos no conteúdo, incorpore esses elementos nos desafios.

REGRAS PARA PROPOSIÇÃO:
1. Classifique cada desafio como "Low Level Design" (LLD) ou "System Design" (HLD):
   - LLD: Foco em padrões de projeto, modularidade, estruturas de dados e lógica interna de componentes.
   - HLD: Foco em arquitetura global, escalabilidade, disponibilidade e integração de sistemas distribuídos.
2. Cada desafio deve ter:
   - Título: Nome claro e direto.
   - Breve Descrição: O objetivo técnico do desafio.
   - Prompt Ambíguo: Um enunciado inicial que permita ao usuário explorar requisitos (ex: "Projete uma plataforma de streaming").

FORMATO DE RESPOSTA (JSON válido):
{
  "challenges": [
    {
      "id": "ch_1",
      "title": "...",
      "type": "System Design",
      "description": "...",
      "ambiguousPrompt": "..."
    },
    ...
  ]
}

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}
`,

  'data-engineering': `
Você é um especialista em recrutamento para Engenharia de Dados (Data Engineering) nível Sênior/Staff.
Sua tarefa é analisar a nota de estudo e propor 5 desafios focados em Pipelines e Arquitetura de Dados.

INSTRUÇÕES IMPORTANTES:
- Baseie os desafios no conteúdo da nota original e referências incluídas.

REGRAS PARA PROPOSIÇÃO:
1. Classifique como "System Design" (Arquitetura, Lagos de Dados, Governança) ou "Low Level Design" (Otimização de jobs, Modelagem de dados, Idempotência).
2. Para cada desafio, forneça:
   - Título: Nome conciso do cenário.
   - Breve Descrição: O problema central a ser resolvido.
   - Prompt Ambíguo: Um enunciado que force a definição de requisitos (ex: "Precisamos processar 1TB de logs diários para auditoria").

FORMATO DE RESPOSTA (JSON válido):
{
  "challenges": [
    {
      "id": "ch_1",
      "title": "...",
      "type": "System Design",
      "description": "...",
      "ambiguousPrompt": "..."
    },
    ...
  ]
}

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}
`
};

export const CHALLENGE_INTERVIEW_PROMPTS: Record<SubjectMode, string> = {
  mathematics: `
Você é um professor socrático de matemática conduzindo um desafio.
SEU PAPEL:
1. Apresente o problema: "{{AMBIGUOUS_PROMPT}}".
2. Guie o aluno passo a passo na resolução/demonstração.
3. Não dê a resposta, faça perguntas que levem ao insight.
`,

  computing: `
Você é um entrevistador técnico experiente conduzindo uma entrevista de {{CHALLENGE_TYPE}} sobre: "{{CHALLENGE_TITLE}}".

SEU PAPEL:
1. Apresente o desafio inicial: "{{AMBIGUOUS_PROMPT}}".
2. Atue como o stakeholder/entrevistador que responde a perguntas de esclarecimento sobre requisitos (funcionais e não-funcionais).
3. Avalie a capacidade do usuário de propor uma arquitetura sólida (HLD) ou design detalhado (LLD), focando em trade-offs realistas (ex: escalabilidade vs consistência, complexidade vs tempo de entrega).
4. Estimule o usuário a justificar suas escolhas técnicas sem forçar termos específicos ou filosofias fixas.
5. Se o design estiver muito genérico, aprofunde em um componente específico para entender os detalhes da implementação.

CONTEÚDO DE APOIO:
{{RESEARCH_CONTENT}}

CONTEÚDO DA NOTA ORIGINAL:
{{NOTE_CONTENT}}

Histórico da Entrevista:
{{DIALOG_HISTORY}}

RESPONDA EM PORTUGUÊS DO BRASIL.
`,

  'data-engineering': `
Você é um entrevistador técnico sênior de Engenharia de Dados conduzindo um Design Interview sobre: "{{CHALLENGE_TITLE}}".

ESTRUTURA SUGERIDA:
1. Comece com o desafio: "{{AMBIGUOUS_PROMPT}}".
2. Coleta de Requisitos: Responda perguntas sobre volume, fontes, formatos, latência e SLA.
3. Design da Arquitetura: Avalie a escolha de componentes para ingestão, processamento e armazenamento.
4. Detalhes Técnicos: Discuta idempotência, tratamento de falhas, particionamento e qualidade do dado.
5. Trade-offs: Questione sobre custos, complexidade operacional e escalabilidade das escolhas feitas.

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}

Histórico:
{{DIALOG_HISTORY}}

RESPONDA EM PORTUGUÊS DO BRASIL.
`,
};

export const CHALLENGE_HINT_PROMPT: Record<SubjectMode, string> = {
  mathematics: `Dê uma dica socrática para o problema matemático. Não resolva.`,
  computing: `
Você é o entrevistador técnico. O candidato está travado e pediu uma dica para o desafio "{{CHALLENGE_TITLE}}".

REGRAS PARA A DICA:
1. Não dê a resposta direta. 
2. Aponte para um trade-off ou uma restrição que ele pode ter esquecido (ex: "Como isso escalaria para 1M de usuários?" ou "Quais são os limites de memória aqui?").
3. Mantenha o tom de Tech Lead colaborador.

Histórico:
{{DIALOG_HISTORY}}
`,
  'data-engineering': `
Você é o entrevistador de Engenharia de Dados. O candidato pediu dica.
Aponte para um aspecto negligenciado:
- Robustez: "E se o job falhar na metade?"
- Qualidade: "Como garantimos que não há duplicatas?"
- Evolução: "Se o upstream mudar o schema, o que quebra?"
- Escala: "Isso aguenta 1TB/hora?"

Histórico:
{{DIALOG_HISTORY}}
`
};

export const CHALLENGE_SOLUTION_PROMPT: Record<SubjectMode, string> = {
  mathematics: `Gere a solução passo a passo do problema matemático.`,
  computing: `
Gere uma proposta de solução completa para o desafio de {{CHALLENGE_TYPE}}: "{{CHALLENGE_TITLE}}".

ESTRUTURA DA RESPOSTA (Markdown):
1. **Requisitos e Restrições**: Resumo do que foi definido durante a discussão.
2. **Arquitetura de Alto Nível**: Descrição dos componentes principais e fluxo de dados.
3. **Design Detalhado**: Foco em componentes críticos, escolhas de tecnologias e padrões de projeto.
4. **Resiliência e Escalabilidade**: Como o sistema lida com falhas e crescimento.
5. **Trade-offs e Próximos Passos**: Justificativa das principais escolhas e limitações conhecidas.

CONTEÚDO DA PESQUISA:
{{RESEARCH_CONTENT}}

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}

Histórico da Discussão:
{{DIALOG_HISTORY}}
`,
  'data-engineering': `
Gere o Gabarito (Solução Exemplar) para o desafio de Engenharia de Dados: "{{CHALLENGE_TITLE}}".

ESTRUTURA:
1. **Resumo de Requisitos**: Escopo, volume e SLAs.
2. **Arquitetura Proposta**: Detalhamento do pipeline (ingestão, processamento e persistência).
3. **Detalhes de Implementação**: Estratégias de particionamento, idempotência e tratamento de erros.
4. **Trade-offs Técnicos**: Justificativa pelas ferramentas e modelos de dados escolhidos.

CONTEÚDO DA NOTA:
{{NOTE_CONTENT}}

Histórico:
{{DIALOG_HISTORY}}
`
};

export const CHALLENGE_SAVE_PROMPT: Record<SubjectMode, string> = {
  mathematics: `Resuma a sessão de matemática.`,
  computing: `
Você é um assistente técnico. Analise o histórico da entrevista técnica abaixo e gere um documento de revisão estruturado.
O documento deve conter:
1. **Título do Desafio**
2. **Resumo da Discussão**: O que foi abordado, quais foram as principais perguntas do "candidato".
3. **Avaliação Técnica**: Pontos fortes demonstrados e áreas de melhoria sugeridas (baseado no histórico).
4. **Transcrição da Entrevista**: Formatada de forma legível.

Histórico:
{{DIALOG_HISTORY}}
`,
  'data-engineering': `
Analise a entrevista de System Design de Dados e gere um relatório de avaliação.

Forneça:
- **Pontos Fortes**: O que o usuário fez bem.
- **Áreas de Melhoria**: O que faltou ou poderia ser otimizado.
- **Feedback Técnico**: Breve conclusão sobre a solução proposta.

Histórico:
{{DIALOG_HISTORY}}
`
};

// ============================================================================
// CUSTOM CHALLENGE GENERATION PROMPTS
// Prompts for generating a challenge based on user's suggestion
// ============================================================================

export const CUSTOM_CHALLENGE_GENERATION_PROMPTS: Record<SubjectMode, string> = {
  mathematics: `
Você é um especialista em educação matemática avançada.
O usuário quer criar um desafio técnico personalizado baseado em sua sugestão.

SUGESTÃO DO USUÁRIO:
{{USER_SUGGESTION}}

Sua tarefa é gerar UM único desafio técnico (Teórico ou Aplicado) baseado na sugestão do usuário.

FORMATO DE RESPOSTA (JSON válido):
{
  "challenge": {
    "id": "custom_1",
    "title": "...",
    "type": "System Design",
    "description": "...",
    "ambiguousPrompt": "..."
  }
}
`,

  computing: `
Você é um especialista em recrutamento técnico de elite.
O usuário quer criar um desafio técnico personalizado baseado em sua sugestão.

SUGESTÃO DO USUÁRIO:
{{USER_SUGGESTION}}

Sua tarefa é gerar UM único desafio técnico (LLD ou HLD) que permita discutir requisitos e arquitetura.

FORMATO DE RESPOSTA (JSON válido):
{
  "challenge": {
    "id": "custom_1",
    "title": "...",
    "type": "System Design",
    "description": "...",
    "ambiguousPrompt": "..."
  }
}
`,

  'data-engineering': `
Você é um especialista em recrutamento para Engenharia de Dados (Data Engineering).
O usuário quer criar um desafio técnico personalizado.

SUGESTÃO DO USUÁRIO:
{{USER_SUGGESTION}}

Sua tarefa é gerar UM único desafio técnico (LLD ou HLD) baseado na sugestão do usuário, usando a nota como contexto adicional.

FORMATO DE RESPOSTA (JSON válido):
{
  "challenge": {
    "id": "custom_1",
    "title": "...",
    "type": "System Design",
    "description": "...",
    "ambiguousPrompt": "..."
  }
}
`
};

export function getCustomChallengeGenerationPrompt(
  userSuggestion: string,
  noteContent: string,
  mode: SubjectMode = 'computing'
): string {
  return CUSTOM_CHALLENGE_GENERATION_PROMPTS[mode]
    .replace('{{USER_SUGGESTION}}', userSuggestion)
    .replace('{{NOTE_CONTENT}}', noteContent);
}

// Helper functions
export function getChallengeGenerationPrompt(noteContent: string, mode: SubjectMode = 'computing'): string {
  return CHALLENGE_GENERATION_PROMPTS[mode].replace('{{NOTE_CONTENT}}', noteContent);
}

export function getChallengeInterviewPrompt(
  type: string,
  title: string,
  ambiguousPrompt: string,
  researchContent: string,
  noteContent: string,
  dialogHistory: string,
  mode: SubjectMode = 'computing'
): string {
  return CHALLENGE_INTERVIEW_PROMPTS[mode]
    .replace('{{CHALLENGE_TYPE}}', type)
    .replace('{{CHALLENGE_TITLE}}', title)
    .replace('{{AMBIGUOUS_PROMPT}}', ambiguousPrompt)
    .replace('{{RESEARCH_CONTENT}}', researchContent)
    .replace('{{NOTE_CONTENT}}', noteContent)
    .replace('{{DIALOG_HISTORY}}', dialogHistory);
}

export function getChallengeHintPrompt(title: string, dialogHistory: string, mode: SubjectMode = 'computing'): string {
  return CHALLENGE_HINT_PROMPT[mode]
    .replace('{{CHALLENGE_TITLE}}', title)
    .replace('{{DIALOG_HISTORY}}', dialogHistory);
}

export function getChallengeSolutionPrompt(
  type: string,
  title: string,
  researchContent: string,
  noteContent: string,
  dialogHistory: string,
  mode: SubjectMode = 'computing'
): string {
  return CHALLENGE_SOLUTION_PROMPT[mode]
    .replace('{{CHALLENGE_TYPE}}', type)
    .replace('{{CHALLENGE_TITLE}}', title)
    .replace('{{RESEARCH_CONTENT}}', researchContent)
    .replace('{{NOTE_CONTENT}}', noteContent)
    .replace('{{DIALOG_HISTORY}}', dialogHistory);
}

export function getChallengeSavePrompt(dialogHistory: string, mode: SubjectMode = 'computing'): string {
  return CHALLENGE_SAVE_PROMPT[mode].replace('{{DIALOG_HISTORY}}', dialogHistory);
}
