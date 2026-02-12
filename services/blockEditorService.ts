// ============================================================================
// BLOCK EDITOR SERVICE
// LLM-powered actions for Notion-style block editing
// ============================================================================

import { BlockAction, CodeLanguage, SubjectMode } from "../types";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

subscribe(() => { resetClient(); });

// Prompt templates for each block action
const BLOCK_ACTION_PROMPTS: Record<BlockAction, string> = {
    'mermaid-sequence': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama de sequência Mermaid que ilustre o fluxo principal descrito.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
sequenceDiagram
    ...
\`\`\`
`,
    'mermaid-graph': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama de grafo Mermaid que mostre as relações entre os componentes/conceitos.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
graph TD
    ...
\`\`\`
`,
    'mermaid-flowchart': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um fluxograma Mermaid que represente o processo ou algoritmo descrito.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
flowchart TD
    ...
\`\`\`
`,
    'mermaid-class': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama de classes Mermaid que represente a estrutura de classes/interfaces.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
classDiagram
    ...
\`\`\`
`,
    'mermaid-er': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama ER (Entidade-Relacionamento) Mermaid que represente o modelo de dados.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
erDiagram
    ...
\`\`\`
`,
    'mermaid-state': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama de estados Mermaid que represente as transições de estado.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
stateDiagram-v2
    ...
\`\`\`
`,
    'mermaid-gantt': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um diagrama Gantt Mermaid que represente o cronograma ou fases do processo/projeto.
Retorne APENAS o bloco de código mermaid, sem explicação adicional.
Formato:
\`\`\`mermaid
gantt
    ...
\`\`\`
`,
    'tradeoffs-table': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere uma tabela de trade-offs em formato Markdown.
A tabela deve comparar as abordagens, tecnologias ou opções mencionadas no conteúdo.
Inclua colunas como: Aspecto, Opção A, Opção B (adapte conforme o contexto).
Adicione prós, contras, e quando usar cada opção.
Retorne APENAS a tabela markdown com um título ## Trade-offs, sem explicação adicional.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'code-example': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um exemplo de código prático e completo que demonstre o conceito principal.
O código deve ser funcional, bem comentado, e seguir boas práticas.
Retorne o código dentro de um bloco markdown com a linguagem especificada.
Adicione um breve título ## Exemplo de Código antes do bloco.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'implementation-guide': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um guia de implementação passo-a-passo.
Inclua:
- Pré-requisitos
- Passos numerados com explicações concisas
- Pontos de atenção e armadilhas comuns
- Checklist de validação

Use formatação Markdown com títulos ## e listas.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'enrich': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, enriqueça a seção indicada com mais detalhes, exemplos práticos, e contexto adicional.
Mantenha o mesmo estilo e tom do documento original.
NÃO repita o conteúdo existente — adicione apenas conteúdo novo e complementar.
Retorne APENAS o conteúdo adicional em formato Markdown.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'more-detailed': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, expanda a seção indicada com uma explicação mais detalhada e aprofundada.
Inclua nuances, casos especiais, e fundamentação teórica quando relevante.
NÃO repita o conteúdo existente — apenas aprofunde.
Retorne APENAS o conteúdo adicional em formato Markdown.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'summarize': `
Baseando-se no CONTEÚDO COMPLETO DA NOTA fornecido, gere um resumo conciso e estruturado da seção indicada.
Use bullet points para os pontos principais.
Retorne APENAS o resumo em formato Markdown com título ## Resumo.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'requirements': `
ATUE COMO: Um Lead Enginee (Não precisa mencionar que é um, mas escreva como um)r.
OBJETIVO: Definir requisitos técnicos detalhados e implementáveis baseados no contexto.
CONTEXTO: Análise da nota fornecida e instruções do usuário.

SAÍDA ESPERADA (Markdown):
## 1. Escopo e Contexto
Breve descrição do problema e limites do sistema.

## 2. Requisitos Funcionais (RF)
Liste os comportamentos esperados do sistema.
- **[RF-001] Título Curto**: Descrição técnica precisa. (Ex: "O endpoint X deve validar Y e retornar Z")
- **critérios de aceitação**: Liste 1-2 critérios claros.

## 3. Requisitos Não-Funcionais (RNF) - SLA e Constraints
Foque em métricas mensuráveis.
- **Performance**: Ex: Latência < 200ms no p95.
- **Escalabilidade**: Ex: Suportar 10k RPM.
- **Segurança**: Ex: Autenticação OAuth2, criptografia em repouso.
- **Disponibilidade**: Ex: 99.9% uptime.

## 4. Casos de Borda e Limitações
O que o sistema NÃO faz ou situações de erro críticas.

ESTILO: Direto, técnico e focado em viabilidade de implementação.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'api-contract': `
ATUE COMO: Um Engenheiro de Backend Sênior especialista em Design de APIs (Não precisa mencionar que é um, mas escreva como um).
OBJETIVO: Criar um contrato de interface rigoroso e pronto para implementação (API First).
CONTEXTO: Baseado na nota e instruções.
Escolha o estilo adequado (REST, GraphQL, gRPC ou Interface de Classe/Método) baseado no contexto, mas priorize REST se não especificado.

### Recurso / Componente Principal

**1. [VERBO] /endpoint/path**
- **Resumo**: O que faz.
- **Request Headers**: (se aplicável, ex: Auth).
- **Request Body (Schema JSON/Typescript)**:
\`\`\`json
{
  "field": "type | description | validation constraint",
  "optional?": "boolean"
}
\`\`\`
- **Response Success (200 OK)**:
\`\`\`json
{ ... }
\`\`\`
- **Response Errors**:
  - 400 Bad Request: (motivos)
  - 401/403: (regras de acesso)
  - 5xx: (comportamento)

### Detalhes de Implementação da Interface
- **Validações**: Regras de negócio aplicadas na entrada.
- **Idempotência**: O endpoint é idempotente? Como tratar retries?

ESTILO: Formal, preciso e usando tipos de dados explícitos.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'system-spec': `
ATUE COMO: Um Staff Software Engineer arquitetando uma solução (Não precisa mencionar que é um, mas escreva como um).
OBJETIVO: Criar uma Especificação Técnica de Sistema (System Spec / HLD) robusta.
CONTEXTO: Baseado na nota e instruções.
ESTILO: Focado em trade-offs reais, gargalos e robustez. Evite descrições genéricas.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'implementation-design': `
ATUE COMO: Um Tech Lead focado em Low Level Design (LLD) (Não precisa mencionar que é um, mas escreva como um).
OBJETIVO: Guiar o desenvolvedor no "COMO" escrever o código.
CONTEXTO: Baseado na nota e instruções.
ESTILO: Prático, direto ao código e padrões de projeto.
RESPONDA EM PORTUGUÊS DO BRASIL.
`,
    'implementation-tasks': `
ATUE COMO: Um Engineering Manager ou Tech Lead planejando uma Sprint (Não precisa mencionar que é um, mas escreva como um).
OBJETIVO: Quebrar a implementação em tarefas pequenas, estimáveis e ordenadas.
CONTEXTO: Baseado na nota e instruções.
ESTILO: Acionável. Use verbos no imperativo (Criar, Configurar, Implementar). Definir dependências claras.
RESPONDA EM PORTUGUÊS DO BRASIL.
`
};

const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
    python: 'Python',
    java: 'Java',
    pseudocode: 'Pseudocódigo',
    terraform: 'Terraform',
    go: 'Go',
    typescript: 'TypeScript',
    rust: 'Rust',
    scala: 'Scala',
    sql: 'SQL',
    pyspark: 'PySpark',
    cloudformation: 'CloudFormation',
    kubernetes: 'Kubernetes YAML'
};

/**
 * Generates content for a block action using Gemini API.
 * Sends the full note content as context along with the specific action prompt.
 */
export async function generateBlockAction(
    action: BlockAction,
    noteContent: string,
    blockContent: string,
    mode: SubjectMode,
    sourceContent?: string,
    language?: CodeLanguage,
    userInstruction?: string,
    parentHeaderLevel: number = 0
): Promise<string> {
    const client = getClient();
    if (!client) throw new Error("API Client not ready. Configure your API key in Settings.");

    let prompt = BLOCK_ACTION_PROMPTS[action];

    // Instruction to maintain header hierarchy
    const hierarchyInstruction = parentHeaderLevel > 0
        ? `\nREGRA DE HIERARQUIA: O conteúdo gerado está sendo inserido abaixo de um título de Nível ${parentHeaderLevel} (#${'#'.repeat(parentHeaderLevel - 1)}). 
           Portanto, use APENAS títulos de nível ${parentHeaderLevel + 1} em diante (ex: ## se o pai for #, ### se o pai for ##, etc) para manter a estrutura do documento. 
           Inicie seus títulos principais com Nível ${parentHeaderLevel + 1} (${'#'.repeat(parentHeaderLevel + 1)}).\n`
        : '';

    // For code examples, add the language specification
    if (action === 'code-example' && language) {
        prompt += `\nLINGUAGEM: ${CODE_LANGUAGE_LABELS[language] || language}\nUse a linguagem ${CODE_LANGUAGE_LABELS[language] || language} para o exemplo.`;
    }

    const modeDescription = mode === 'mathematics'
        ? 'Contexto: Matemática. Use notação LaTeX quando relevante.'
        : mode === 'data-engineering'
            ? 'Contexto: Engenharia de Dados. Foque em pipelines, processamento e armazenamento de dados.'
            : 'Contexto: Computação / Engenharia de Software. Foque em arquitetura, algoritmos e sistemas.';

    const fullPrompt = `${modeDescription}
${hierarchyInstruction}

${prompt}

CONTEÚDO COMPLETO DA NOTA:
${noteContent}

${sourceContent ? `CONTEÚDO DO ARQUIVO FONTE (contexto adicional):\n${sourceContent.substring(0, 15000)}\n` : ''}SEÇÃO/BLOCO ATUAL (contexto para a ação):
${blockContent}

${userInstruction ? `INSTRUÇÃO ADICIONAL DO USUÁRIO:\n${userInstruction}\n\nSiga a instrução acima como guia principal para gerar o conteúdo.\n` : ''}RESPONDA EM PORTUGUÊS DO BRASIL.`;

    const responseStream = await client.models.generateContentStream({
        model: getSelectedModel(),
        contents: fullPrompt,
        config: { temperature: 0.7 }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
        if (chunk.text) {
            fullText += chunk.text;
        }
    }
    return fullText;
}

export { CODE_LANGUAGE_LABELS };
