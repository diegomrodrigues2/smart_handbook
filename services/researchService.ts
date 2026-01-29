export const RESEARCH_CONTENT = `
Manual Avançado de Engenharia de Desafios Técnicos: Metodologias para Criação, Estruturação e Avaliação de System Design e Low Level Design

1. A Filosofia e a Psicologia do Design de Entrevistas Técnicas
- O objetivo é extrair Sinais de Senioridade (Júnior vs Sênior vs Staff).
- Engenharia da Ambiguidade Intencional: O desafio deve começar vago para forçar o Requirements Gathering.
- O entrevistador atua como colaborador (Tech Lead).

2. Metodologia para High Level Design (HLD)
- Foco em macro-arquitetura: Componentes, Escalabilidade, Disponibilidade.
- Matriz de Requisitos Ocultos: Escala (DAU), Padrão de Acesso (Read/Write Heavy), Latência, Confiabilidade.
- Deep Dives: Aprofundar em 1 ou 2 componentes (ex: Fan-out, Sharding).
- Teorema CAP e PACELC: Forçar decisões entre Consistência vs Disponibilidade vs Latência.
- SQL vs NoSQL: Justificar escolha baseada no modelo de dados.

3. Metodologia para Low Level Design (LLD)
- Foco em qualidade de código, modularidade e SOLID.
- Domínios: Estacionamento, Elevador, Jogos de Tabuleiro.
- Princípios SOLID como critério de design.
- Design Patterns: Strategy, Factory, Observer, Decorator, Singleton.

4. Engenharia Reversa
- Observar apps reais (Uber, WhatsApp, Netflix) e deduzir arquitetura.
- Trace the Data: Ciclo de vida do dado crítico (ex: motorista atualizando GPS).
- Identificar falhas e trade-offs (ex: Concorrência em reservas, Consistência Eventual em feeds).

5. Avaliação
- Uso de Rúbricas e Scorecards.
- Dimensões: Scoping, Design Técnico, Escalabilidade, Trade-offs, Comunicação.
`;
