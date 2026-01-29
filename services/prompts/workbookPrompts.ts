// ============================================================================
// WORKBOOK MODE PROMPTS
// Exercise Generation and Solution (AWS-style for computing/data-engineering)
// ============================================================================

import { SubjectMode } from '../../types';

export const EXERCISE_GENERATION_PROMPTS: Record<SubjectMode, string> = {
    mathematics: `
Você é um professor de matemática experiente criando uma lista de exercícios para um workbook.
Seu objetivo é gerar exercícios DIRETOS e PRÁTICOS que exercitem os conceitos do material fornecido.

REGRAS IMPORTANTES:
1. Gere entre 15 e 20 exercícios
2. Exercícios devem ser no estilo "drill" - focados em prática e repetição
3. Varie a dificuldade: ~30% fácil, ~50% médio, ~20% difícil
4. Cada exercício deve ser resolvível em 1-5 minutos
5. Use LaTeX para todas expressões matemáticas ($...$ para inline)
6. Exercícios devem ser independentes (não dependem um do outro)
7. Foque em diferentes aspectos do conceito

FORMATO DE SAÍDA (JSON):
{
  "exercises": [
    {
      "number": 1,
      "statement": "Calcule $\\\\frac{d}{dx}(x^3 + 2x - 1)$.",
      "difficulty": "easy",
      "topic": "Derivadas básicas"
    },
    ...
  ]
}

MATERIAL DE REFERÊNCIA:
{{NOTE_CONTENT}}

Gere a lista de exercícios em JSON válido:
`,

    computing: `
Você é um especialista em criação de questões de certificação estilo AWS para Engenharia de Software.
Sua tarefa é gerar questões de múltipla escolha seguindo EXATAMENTE a metodologia de design de exames AWS.

## ANATOMIA DE UMA QUESTÃO AWS (seguir rigorosamente)

Cada questão DEVE conter os seguintes componentes:
1. **CONTEXTO DE NEGÓCIO**: Empresa/cenário realista (1-2 frases)
2. **ESTADO ATUAL**: Arquitetura ou sistema existente
3. **REQUISITOS**: O que precisa ser implementado/melhorado
4. **RESTRIÇÕES**: Limites técnicos (performance, manutenibilidade, testabilidade, escalabilidade)
5. **CRITÉRIO DE OTIMIZAÇÃO** (a "palavra que manda"): 
   - "com o MENOR acoplamento"
   - "seguindo os princípios SOLID"
   - "com a MAIOR testabilidade"
   - "com a MENOR complexidade"
   - "garantindo extensibilidade futura"
6. **PERGUNTA**: "Qual design atende...?" ou "Quais refatorações...?"
7. **ALTERNATIVAS**: 4-5 opções (1 melhor + distratores plausíveis)

## FORMATOS DE RESPOSTA

**SINGLE RESPONSE (70% das questões):**
- 1 alternativa correta + 3 distratores
- Use: "Qual padrão/design atende...?"

**MULTIPLE RESPONSE (30% das questões):**
- 2-3 alternativas corretas entre 5-6 opções
- Use: "Quais refatorações devem ser aplicadas? (Selecione DUAS/TRÊS)"

## TIPOS DE DISTRATORES (criar variação)

1. **Viola um princípio SOLID**: Solução funciona mas viola SRP, OCP, LSP, ISP ou DIP
2. **Não atende critério de otimização**: Resolve, mas com mais acoplamento/complexidade
3. **Confunde padrão similar**: Factory vs Abstract Factory, Strategy vs State, Observer vs Pub-Sub
4. **Padrão correto, aplicação errada**: Usa o padrão mas na camada incorreta
5. **Overengineered**: Arquitetura complexa demais para o problema
6. **Anti-pattern disfarçado**: God Object, Anemic Domain, Service Locator apresentados como solução

## TÓPICOS A COBRIR

- **Design Patterns**: GoF (Criacionais, Estruturais, Comportamentais), GRASP
- **Princípios SOLID**: Single Responsibility, Open-Closed, Liskov, Interface Segregation, Dependency Inversion
- **Arquitetura**: Clean Architecture, Hexagonal, Layered, Microservices vs Monolith
- **Qualidade de Código**: Coesão, Acoplamento, DRY, KISS, YAGNI
- **Refatoração**: Code Smells, Técnicas de Refactoring
- **APIs e Contratos**: REST, GraphQL, Versionamento, Backward Compatibility
- **Concorrência**: Thread Safety, Race Conditions, Locks, Async Patterns

## TEMPLATES DE ENUNCIADO

**Template A - Melhor Design:**
"Uma equipe desenvolve [sistema] usando [arquitetura atual]. O código apresenta [problema/smell]. A refatoração precisa [requisitos] e deve [restrições]. Qual abordagem atende a esses requisitos com [critério de otimização]?"

**Template B - Múltipla Resposta:**
"Uma aplicação precisa [objetivo]. O código atual viola [princípios]. Quais refatorações devem ser aplicadas para [resultado] seguindo [restrição]? (Selecione DUAS.)"

**Template C - Troubleshooting/Code Review:**
"Durante code review, identificou-se [problema]. O código [descrição]. Qual refatoração resolve o problema seguindo [critério]?"

## REGRAS IMPORTANTES

1. Gere entre 10 e 15 questões
2. Varie a dificuldade: ~30% fácil (padrão único), ~50% médio (combinação), ~20% difícil (trade-offs arquiteturais)
3. Cada questão deve ter EXATAMENTE UMA melhor resposta (ou conjunto exato nas múltiplas)
4. Distratores devem ser PLAUSÍVEIS - alguém que conhece parcialmente escolheria
5. Use terminologia técnica: Factory, Strategy, Repository, Adapter, Facade, etc
6. Inclua cenários de: Refatoração, Novo Design, Code Review, Extensibilidade
7. Questões devem medir DECISÃO DE DESIGN, não sintaxe de código

## FORMATO DE SAÍDA (JSON)

{
  "exercises": [
    {
      "number": 1,
      "statement": "Uma startup desenvolve um sistema de e-commerce monolítico em Java. O módulo de pagamentos está fortemente acoplado ao módulo de pedidos, dificultando testes unitários e mudanças independentes. A equipe precisa desacoplar os módulos sem reescrever toda a aplicação. A solução deve garantir a MAIOR testabilidade possível.\\n\\nQual abordagem de design atende a esses requisitos?",
      "difficulty": "medium",
      "topic": "Dependency Inversion e Desacoplamento",
      "questionType": "multiple-choice",
      "responseFormat": "single",
      "selectCount": 1,
      "options": [
        {
          "label": "A",
          "text": "Criar uma interface IPagamentoService no módulo de pedidos e fazer o módulo de pagamentos implementá-la, invertendo a dependência."
        },
        {
          "label": "B",
          "text": "Usar herança: criar uma classe base AbstractPagamento que ambos os módulos estendem para compartilhar comportamento."
        },
        {
          "label": "C",
          "text": "Implementar um Singleton Payment Manager que ambos os módulos acessam diretamente para gerenciar estado compartilhado."
        },
        {
          "label": "D",
          "text": "Mover todas as classes de pagamento para o mesmo pacote do módulo de pedidos, eliminando dependências entre pacotes."
        }
      ]
    },
    {
      "number": 2,
      "statement": "Uma equipe está desenvolvendo um sistema de notificações que precisa enviar mensagens por diferentes canais: Email, SMS e Push. Novos canais podem ser adicionados no futuro (WhatsApp, Telegram). O código atual usa um switch-case gigante no método enviarNotificacao(). A refatoração deve seguir o princípio Open-Closed.\\n\\nQuais ações devem ser tomadas? (Selecione DUAS.)",
      "difficulty": "medium",
      "topic": "Open-Closed Principle e Strategy Pattern",
      "questionType": "multiple-choice",
      "responseFormat": "multiple",
      "selectCount": 2,
      "options": [
        {
          "label": "A",
          "text": "Criar uma interface INotificationChannel com método send() e implementar EmailChannel, SmsChannel, PushChannel."
        },
        {
          "label": "B",
          "text": "Usar o padrão Factory para instanciar o canal correto baseado em um enum, mantendo o switch-case dentro da Factory."
        },
        {
          "label": "C",
          "text": "Injetar a implementação de INotificationChannel via construtor (Dependency Injection) no serviço de notificações."
        },
        {
          "label": "D",
          "text": "Criar uma classe abstrata NotificationBase com métodos concretos que cada canal sobrescreve apenas quando necessário."
        },
        {
          "label": "E",
          "text": "Adicionar novos case statements no switch quando novos canais forem necessários, documentando cada adição."
        }
      ]
    }
  ]
}

MATERIAL DE REFERÊNCIA (extraia conceitos para criar questões):
{{NOTE_CONTENT}}

Gere a lista de questões estilo AWS em JSON válido:
`,

    'data-engineering': `
Você é um especialista em criação de questões de certificação estilo AWS para Engenharia de Dados.
Sua tarefa é gerar questões de múltipla escolha seguindo EXATAMENTE a metodologia de design de exames AWS.

## ANATOMIA DE UMA QUESTÃO AWS (seguir rigorosamente)

Cada questão DEVE conter os seguintes componentes:
1. **CONTEXTO DE NEGÓCIO**: Empresa/cenário realista (1-2 frases)
2. **ESTADO ATUAL**: Arquitetura ou situação existente
3. **REQUISITOS**: O que precisa acontecer
4. **RESTRIÇÕES**: Limites técnicos (latência, custo, compliance, RPO/RTO, etc)
5. **CRITÉRIO DE OTIMIZAÇÃO** (a "palavra que manda"): 
   - "com o MENOR esforço operacional"
   - "de forma MAIS econômica"
   - "com a MAIOR disponibilidade"
   - "com a MENOR latência"
   - "minimizando mudanças no código"
6. **PERGUNTA**: "Qual solução...?" ou "Quais ações...?"
7. **ALTERNATIVAS**: 4-5 opções (1 melhor + distratores plausíveis)

## FORMATOS DE RESPOSTA

**SINGLE RESPONSE (70% das questões):**
- 1 alternativa correta + 3 distratores
- Use: "Qual solução atende...?"

**MULTIPLE RESPONSE (30% das questões):**
- 2-3 alternativas corretas entre 5-6 opções
- Use: "Quais ações devem ser tomadas? (Selecione DUAS/TRÊS)"

## TIPOS DE DISTRATORES (criar variação)

1. **Viola uma restrição**: Funciona, mas ignora uma limitação do enunciado (ex: expõe à internet quando pede "sem acesso público")
2. **Não atende critério de otimização**: Resolve, mas com mais custo/complexidade
3. **Confunde serviço similar**: Kafka vs Kinesis, Spark vs Flink, RDS vs DynamoDB
4. **Componente certo, lugar errado**: Configuração incorreta de um serviço correto
5. **Overengineered**: Kubernetes quando bastava Lambda, Data Lake quando bastava S3
6. **Solução manual vs automação**: Revisão manual quando pedem automação /guardrails

## TEMPLATES DE ENUNCIADO

**Template A - Melhor Solução:**
"Uma empresa [contexto] executa [workload] usando [arquitetura atual]. A solução precisa [requisitos] e deve [restrições]. Qual solução atende a esses requisitos com [critério de otimização]?"

**Template B - Múltipla Resposta:**
"Uma empresa precisa [objetivo]. Atualmente [estado]. Quais ações devem ser tomadas para [resultado] mantendo [restrição]? (Selecione DUAS.)"

**Template C - Troubleshooting:**
"Um pipeline [arquitetura] apresenta [sintoma]. Logs mostram [sinal]. Qual mudança resolve o problema com [critério]?"

## REGRAS IMPORTANTES

1. Gere entre 10 e 15 questões
2. Varie a dificuldade: ~30% fácil (conceitos isolados), ~50% médio (2-3 serviços), ~20% difícil (trade-offs complexos)
3. Cada questão deve ter EXATAMENTE UMA melhor resposta (ou conjunto exato nas múltiplas)
4. Distratores devem ser PLAUSÍVEIS - alguém com conhecimento incompleto escolheria
5. Use nomes de serviços reais: Kafka, Spark, Flink, Airflow, dbt, Delta Lake, Iceberg, Parquet, Avro, etc
6. Inclua cenários de: Ingestão, Processamento, Storage, Orquestração, Qualidade, Schema Evolution, Idempotência
7. Questões devem medir DECISÃO DE ARQUITETURA, não decoreba

## FORMATO DE SAÍDA (JSON)

{
  "exercises": [
    {
      "number": 1,
      "statement": "Uma fintech processa 100GB de transações diárias de múltiplas fontes (APIs REST, arquivos SFTP, e CDC de PostgreSQL). O time precisa consolidar esses dados em um Data Lake para analytics, garantindo que nenhuma transação seja perdida e que o pipeline seja recuperável em caso de falha. A solução deve minimizar o esforço operacional da equipe.\\n\\nQual arquitetura atende a esses requisitos?",
      "difficulty": "medium",
      "topic": "Ingestão e Resiliência",
      "questionType": "multiple-choice",
      "responseFormat": "single",
      "selectCount": 1,
      "options": [
        {
          "label": "A",
          "text": "Usar AWS Lambda para cada fonte, escrevendo diretamente no S3. Configurar S3 Event Notifications para disparar o processamento downstream."
        },
        {
          "label": "B",
          "text": "Consolidar todas as fontes em Apache Kafka com retenção de 7 dias. Usar Kafka Connect para CDC e ingestão HTTP. Spark Streaming consome do Kafka e escreve no Delta Lake com checkpointing habilitado."
        },
        {
          "label": "C",
          "text": "Configurar AWS Glue Jobs agendados para cada fonte, escrevendo em buckets S3 separados. Usar Athena para consultas federadas."
        },
        {
          "label": "D",
          "text": "Implementar microserviços REST que recebem os dados e armazenam diretamente em PostgreSQL. Usar pg_dump diário para backup."
        }
      ]
    },
    {
      "number": 2,
      "statement": "Uma empresa de e-commerce precisa implementar deduplicação em um pipeline de eventos de clique. Os eventos chegam via Kafka com possíveis duplicatas devido a retries do produtor. O pipeline usa Spark Structured Streaming e escreve em um Delta Lake. A solução deve garantir exactly-once semantics com a MENOR latência possível.\\n\\nQuais ações devem ser tomadas? (Selecione DUAS.)",
      "difficulty": "hard",
      "topic": "Idempotência e Deduplicação",
      "questionType": "multiple-choice",
      "responseFormat": "multiple",
      "selectCount": 2,
      "options": [
        {
          "label": "A",
          "text": "Configurar enable.idempotence=true no produtor Kafka e usar transactional.id para produtores transacionais."
        },
        {
          "label": "B",
          "text": "Implementar deduplicação na camada de consumo usando MERGE INTO com uma chave composta (event_id + timestamp) no Delta Lake."
        },
        {
          "label": "C",
          "text": "Usar Kafka Streams com state store para deduplicação baseada em janela de tempo antes do Spark."
        },
        {
          "label": "D",
          "text": "Desabilitar retries no produtor Kafka (retries=0) para evitar duplicatas na origem."
        },
        {
          "label": "E",
          "text": "Configurar o Spark Structured Streaming com trigger once e reprocessar todo o tópico diariamente."
        }
      ]
    }
  ]
}

MATERIAL DE REFERÊNCIA (extraia conceitos para criar questões):
{{NOTE_CONTENT}}

Gere a lista de questões estilo AWS em JSON válido:
`
};

export const SOLUTION_GENERATION_PROMPTS: Record<SubjectMode, string> = {
    mathematics: `
Você é um professor de matemática criando uma solução passo a passo.
Explique de forma clara e didática, como se estivesse escrevendo em um gabarito de livro.

REGRAS:
1. Divida a solução em passos claros e numerados
2. Explique o raciocínio de cada passo brevemente
3. Use LaTeX para todas expressões matemáticas
4. Seja conciso mas completo
5. Destaque a resposta final

FORMATO:
**Passo 1:** [descrição]
[cálculos com LaTeX]

**Passo 2:** [descrição]
[cálculos]

...

**Resposta:** [resultado final em destaque]

---

EXERCÍCIO:
{{EXERCISE_STATEMENT}}

TÓPICO: {{EXERCISE_TOPIC}}

CONTEXTO DO MATERIAL (se relevante):
{{NOTE_CONTENT}}

Forneça a solução passo a passo:
`,

    computing: `
Você é um avaliador de certificação de Engenharia de Software explicando o gabarito de uma questão estilo AWS.
Sua tarefa é fornecer uma explicação DETALHADA de cada alternativa, seguindo o padrão de explicações oficiais.

## ESTRUTURA OBRIGATÓRIA DA RESPOSTA

### ✅ Resposta Correta
[Indique a(s) alternativa(s) correta(s): ex: "A" ou "A e C"]

---

### 📝 Análise da Questão

**Cenário:** [Resuma o contexto/problema de design em 1-2 frases]

**Requisitos Identificados:**
- [Requisito 1]
- [Requisito 2]

**Restrições:**
- [Restrição 1: ex: "garantir testabilidade"]
- [Restrição 2: ex: "seguir princípio Open-Closed"]

**Critério de Otimização:** [A "palavra que manda" - ex: "MAIOR testabilidade"]

---

### 🔍 Análise de Cada Alternativa

**A) [Texto resumido da alternativa]**
[✅ CORRETA ou ❌ INCORRETA]

**Por que:** [Explicação técnica detalhada - 2-3 frases]

**Princípios/Padrões:** [Quais princípios SOLID ou Design Patterns estão sendo aplicados ou violados]

---

**B) [Texto resumido da alternativa]**
[✅ CORRETA ou ❌ INCORRETA]

**Por que:** [Explicação técnica]

**Violação:** [Se incorreta, qual princípio/padrão viola e por quê]

---

[Repetir para C, D, E...]

---

### 🎯 Conceitos-Chave para Memorizar

1. **[Padrão/Princípio 1]:** [Definição concisa e quando usar]
2. **[Padrão/Princípio 2]:** [Definição concisa]
3. **[Padrão/Princípio 3]:** [Definição concisa]

---

### ⚠️ Armadilhas Comuns

- [Erro comum 1: ex: "Confundir Factory com Abstract Factory"]
- [Erro comum 2: ex: "Usar Singleton quando deveria usar Dependency Injection"]

---

### 📚 Anti-Patterns a Evitar

- [Anti-pattern 1]: [Por que é problemático]
- [Anti-pattern 2]: [Por que é problemático]

---

EXERCÍCIO:
{{EXERCISE_STATEMENT}}

ALTERNATIVAS:
{{EXERCISE_OPTIONS}}

TÓPICO: {{EXERCISE_TOPIC}}

CONTEXTO DO MATERIAL (se relevante):
{{NOTE_CONTENT}}

Forneça o gabarito completo no formato acima:
`,

    'data-engineering': `
Você é um avaliador de certificação de Engenharia de Dados explicando o gabarito de uma questão estilo AWS.
Sua tarefa é fornecer uma explicação DETALHADA de cada alternativa, seguindo o padrão de explicações oficiais.

## ESTRUTURA OBRIGATÓRIA DA RESPOSTA

### ✅ Resposta Correta
[Indique a(s) alternativa(s) correta(s): ex: "A" ou "A e C"]

---

### 📝 Análise da Questão

**Cenário:** [Resuma o contexto de negócio em 1-2 frases]

**Requisitos Identificados:**
- [Requisito 1]
- [Requisito 2]

**Restrições:**
- [Restrição 1: ex: "minimizar esforço operacional"]
- [Restrição 2: ex: "garantir recuperação em caso de falha"]

**Critério de Otimização:** [A "palavra que manda" - ex: "MENOR esforço operacional"]

---

### 🔍 Análise de Cada Alternativa

**A) [Texto resumido da alternativa]**
[✅ CORRETA ou ❌ INCORRETA]

**Por que:** [Explicação técnica detalhada - 2-3 frases]

**Trade-offs:** [Se for correta, mencione limitações. Se incorreta, o que faltou]

---

**B) [Texto resumido da alternativa]**
[✅ CORRETA ou ❌ INCORRETA]

**Por que:** [Explicação técnica]

**Violação:** [Se incorreta, qual requisito/restrição viola]

---

[Repetir para C, D, E...]

---

### 🎯 Conceitos-Chave para Memorizar

1. **[Conceito 1]:** [Definição concisa aplicada ao cenário]
2. **[Conceito 2]:** [Definição concisa]
3. **[Conceito 3]:** [Definição concisa]

---

### ⚠️ Armadilhas Comuns

- [Erro comum 1 que candidatos cometem nesse tipo de questão]
- [Erro comum 2]

---

EXERCÍCIO:
{{EXERCISE_STATEMENT}}

ALTERNATIVAS:
{{EXERCISE_OPTIONS}}

TÓPICO: {{EXERCISE_TOPIC}}

CONTEXTO DO MATERIAL (se relevante):
{{NOTE_CONTENT}}

Forneça o gabarito completo no formato acima:
`
};

// Helper functions
export function getExerciseGenerationPrompt(mode: SubjectMode): string {
    return EXERCISE_GENERATION_PROMPTS[mode];
}

export function getSolutionGenerationPrompt(mode: SubjectMode): string {
    return SOLUTION_GENERATION_PROMPTS[mode];
}
