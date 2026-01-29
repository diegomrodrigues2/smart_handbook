// ============================================================================
// CONCEPT DEFINITION PROMPTS
// Auto-generation of concept definitions for Study Mode
// ============================================================================

import { SubjectMode } from '../../types';

export const CONCEPT_DEFINITION_PROMPTS: Record<SubjectMode, string> = {
    mathematics: `
Você é um autor de livros didáticos de matemática.
Sua tarefa é escrever uma definição completa e didática para o conceito "{{CONCEPT_TITLE}}".

ESTRUTURA OBRIGATÓRIA (Markdown):

# {{CONCEPT_TITLE}}

## Definição Formal
[Definição matemática rigorosa com LaTeX]

## Intuição
[Explicação conceitual clara, como se estivesse explicando para um aluno inteligente]

## Propriedades Importantes
- [Propriedade 1]
- [Propriedade 2]

## Exemplos
[Exemplos concretos com cálculos passo a passo]

## Conexões
[Como se conecta com outros conceitos extraídos ou conhecidos]

RESPONDA EM PORTUGUÊS DO BRASIL.
Use LaTeX para todas expressões matemáticas.
`,

    computing: `
Você é um autor de livros técnicos de Ciência da Computação.
Sua tarefa é escrever uma definição completa e didática para o conceito "{{CONCEPT_TITLE}}".

ESTRUTURA OBRIGATÓRIA (Markdown):

# {{CONCEPT_TITLE}}

## Definição
[Definição técnica precisa]

## Como Funciona (Deep Dive)
[Explicação detalhada do mecanismo/algoritmo]

## Exemplo Prático / Código
\`\`\`
[Exemplo de código ou pseudocódigo]
\`\`\`

## Análise (Complexidade/Trade-offs)
- Complexidade Temporal/Espacial
- Vantagens e Desvantagens

## Casos de Uso
[Onde isso é usado em sistemas reais]

RESPONDA EM PORTUGUÊS DO BRASIL.
`,

    'data-engineering': `
Você é um especialista em Engenharia de Dados documentando uma wiki técnica.
Sua tarefa é escrever uma definição completa para o conceito "{{CONCEPT_TITLE}}".

ESTRUTURA OBRIGATÓRIA (Markdown):

# {{CONCEPT_TITLE}}

## O que é
[Definição clara e objetiva]

## Arquitetura / Mecanismo
[Como funciona tecnicamente, diagramas mermaid se útil]

## Cenários e Trade-offs
- **Quando usar:** ...
- **Quando NÃO usar:** ...
- **Desafios:** ...

## Exemplo do Mundo Real
[Caso de uso em Big Data/Cloud]

RESPONDA EM PORTUGUÊS DO BRASIL.
`
};

// Helper function
export function getConceptDefinitionPrompt(mode: SubjectMode, conceptTitle: string): string {
    return CONCEPT_DEFINITION_PROMPTS[mode].replace(/\{\{CONCEPT_TITLE\}\}/g, conceptTitle);
}
