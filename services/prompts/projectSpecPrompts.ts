// ============================================================================
// PROJECT SPECIFICATION MODE PROMPTS
// Prompts for generating project descriptions from note/PDF content
// Only available for 'computing' and 'data-engineering' modes
// ============================================================================

import { SubjectMode, ProjectSpecType } from '../../types';

// Description prompt for FROM SCRATCH mode - LOCAL development
export const PROJECT_SPEC_FROM_SCRATCH_PROMPT = `
Você é um Arquiteto de Software sênior. Sua tarefa é criar uma DESCRIÇÃO COMPLETA DE PROJETO baseada no contexto fornecido.

Você NÃO deve implementar nada. Você deve descrever o projeto em um ou dois parágrafos de forma que alguém consiga entender exatamente o que precisa ser construído.

CONTEXTO DA NOTA:
{{NOTE_CONTENT}}

DIREÇÃO DE DESIGN ESCOLHIDA:
{{CHALLENGE_CONTEXT}}

{{DIAGRAM_CONTEXT}}

---

FORMATO DA NOTA:

# {Título Consiso}

Descrição do projeto em um ou dois parágrafos.

REGRAS:
- NÃO escreva código
- NÃO escolha linguagem de programação
- NÃO implemente nada — apenas DESCREVA
- Seja ESPECÍFICO e CONCRETO nos requisitos (não use termos vagos)
- Use exemplos numéricos quando possível (ex: "suportar 10.000 registros", "resposta em < 200ms")
- RESPONDA EM PORTUGUÊS DO BRASIL
`;

// Description prompt for AWS mode - cloud-native production
export const PROJECT_SPEC_AWS_PROMPT = `
Você é um Arquiteto de Soluções AWS experiente. Sua tarefa é criar uma DESCRIÇÃO COMPLETA DE PROJETO para um sistema cloud-native na AWS.

Você NÃO deve implementar nada. Você deve descrever o projeto em um ou dois parágrafos de forma que alguém consiga entender exatamente o que precisa ser construído.

CONTEXTO DA NOTA:
{{NOTE_CONTENT}}

DIREÇÃO DE DESIGN ESCOLHIDA:
{{CHALLENGE_CONTEXT}}

{{DIAGRAM_CONTEXT}}

---

FORMATO DA NOTA:

# {Título Consiso}

Descrição do projeto em um ou dois parágrafos.


REGRAS:
- NÃO escreva código
- NÃO escolha linguagem de programação  
- NÃO implemente nada — apenas DESCREVA
- Seja ESPECÍFICO e CONCRETO nos requisitos (não use termos vagos)
- Use exemplos numéricos quando possível
- Inclua diagrama Mermaid para a arquitetura
- RESPONDA EM PORTUGUÊS DO BRASIL
`;


// Builds the final prompt with context injected
export function getChallengeBasedSpecPrompt(
    noteContent: string,
    specType: ProjectSpecType,
    challengeContext: string,
    solutionOptions: string,
    diagramDescription?: string
): string {
    const prompt = specType === 'fromScratch'
        ? PROJECT_SPEC_FROM_SCRATCH_PROMPT
        : PROJECT_SPEC_AWS_PROMPT;

    const diagramContext = diagramDescription
        ? `DIAGRAMA FORNECIDO PELO USUÁRIO: \n${diagramDescription} `
        : '';

    return prompt
        .replace('{{NOTE_CONTENT}}', noteContent)
        .replace('{{CHALLENGE_CONTEXT}}', challengeContext)
        .replace('{{DIAGRAM_CONTEXT}}', diagramContext);
}

// ============================================================================
// PROJECT DESIGN DIRECTION GENERATION PROMPTS
// Generates design directions based on note/PDF content
// ============================================================================

export const PROJECT_CHALLENGE_GENERATION_PROMPTS: Partial<Record<SubjectMode, string>> = {
    computing: `
Você é um Arquiteto de Software sênior com experiência em System Design e High Level Design.
Sua tarefa é analisar o conteúdo técnico e propor 4-10 PROJETOS PRÁTICOS que apliquem os conceitos do texto pensando
no contexto de cases de System Design e Low Level Design clássicos.

Cada projeto deve ser uma oportunidade de construção concreta — algo que o estudante possa implementar para consolidar o conhecimento.

CONTEÚDO DA NOTA / PDF:
{{NOTE_CONTENT}}

---

RETORNE UM JSON VÁLIDO:
{
    "challenges": [
        {
            "id": "unique_id",
            "title": "Nome do Projeto",
            "type": "System Design" | "Low Level Design",
            "description": "Descrição curta do que será construído e qual conceito ele exercita",
            "ambiguousPrompt": "Construir X que faça Y com foco em Z."
        }
    ]
}

REGRAS PARA PROPOSIÇÃO:
1. Classifique cada desafio como "Low Level Design" (LLD) ou "System Design" (HLD):
   - LLD: Foco em padrões de projeto, modularidade, estruturas de dados e lógica interna de componentes.
   - HLD: Foco em arquitetura global, escalabilidade, disponibilidade e integração de sistemas distribuídos.
2. Cada desafio deve ter:
   - Título: Nome claro e direto.
   - Breve Descrição: O objetivo técnico do desafio.
   - Prompt Ambíguo: Um enunciado inicial que permita ao usuário explorar requisitos (ex: "Projete uma plataforma de streaming").

`,
    'data-engineering': `
Você é um Arquiteto de Dados sênior. Proponha 4-10 PROJETOS DE DADOS PRÁTICOS baseados no conteúdo.
Sua tarefa é analisar o conteúdo técnico e propor 4-10 PROJETOS PRÁTICOS que apliquem os conceitos do texto pensando
no contexto de cases de Arquiteturas de Dados e Modelagem de Dados clássicos.

Cada projeto deve ser uma oportunidade de construção concreta — algo que o estudante possa implementar para consolidar o conhecimento.

CONTEÚDO DA NOTA / PDF:
{{NOTE_CONTENT}}

---

RETORNE UM JSON VÁLIDO:
{
    "challenges": [
        {
            "id": "unique_id",
            "title": "Título do Projeto",
            "type": "Engenharia de Dados" | "Modelagem de Dados",
            "description": "Descrição curta do que será construído e qual conceito ele exercita",
            "ambiguousPrompt": "Construir um sistema de dados para X usando Y."
        }
    ]
}
`
};

export function getProjectChallengeGenerationPrompt(
    noteContent: string,
    mode: SubjectMode
): string {
    const prompt = PROJECT_CHALLENGE_GENERATION_PROMPTS[mode];
    if (!prompt) {
        throw new Error(`Project challenge generation not available for: ${mode}`);
    }
    return prompt.replace('{{NOTE_CONTENT}}', noteContent);
}
