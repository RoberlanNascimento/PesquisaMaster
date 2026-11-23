# 01. Project Brief — PesquisaMaster (Plataforma Eleitoral, Tabulação TSE e Agregador)

## 1. Visão Geral do Produto
O **PesquisaMaster** é uma plataforma completa de inteligência eleitoral, gestão de pesquisas de opinião, auditoria antifraude de coleta em campo, ponderação estatística avançada e agregação de pesquisas (Polling Aggregator), em estrita conformidade com as resoluções do Tribunal Superior Eleitoral (TSE / PesqEle).

## 2. Pilares de Domínio e Módulos Principais
1. **Geografia, Universo e Eleitorado Oficial (IBGE / TSE): GEOGRAFIA (`geographc`):**
   - Base espacial normalizada e repositório de séries temporais do eleitorado e censo.
   - Tabelas no DB que tratam deste item:
      - Estados: Armazena os estados do país
      - Municipios: Armazena os dados cadastrais básicos, população total e eleitorado consolidado das cidades.
      - Regiao_Zonas: Subdivide os municípios em macrorregiões geográficas ou administrativas para organização operacional.
      - Bairros_IBGE: Registra os bairros e distritos como unidades territoriais base para estratificação e alocação de campo.
      - Demografia_IBGE: Guarda as proporções censitárias oficiais (sexo, idade, escolaridade e renda) por município ou bairro.
      - Eleitorado_TSE: Mantém o histórico temporal (snapshot) do eleitorado do TSE e população do IBGE, registrando se a captura foi automática ou manual.   
2. **Engenharia Amostral e Parametrização de Cotas: AMOSTRAS (`sampling`):**
   - Cálculo de dimensionamento (Cochran para populações finitas) e geração das cotas de campo.
   - Tabelas no DB que tratam deste item: 
      -  Amostras: Define os parâmetros estatísticos do plano amostral (margem de erro, confiança, universo e tamanho $n$ de Cochran).
      - Amostras_Dimensao: Especifica quais eixos demográficos (ex.: sexo, faixa etária) serão controlados na pesquisa.
      - Amostras_Cotas: Calcula e monitora as metas físicas e percentuais de entrevistas por bairro e perfil demográfico.
3. **CProjetos de Pesquisa, Governança Legal e Cenários: PESQUISA (`surveys` / `sampling`)**
   - Registro, acompanhamento processual (PesqEle/TSE) e definição de cartelas de teste.
   - Tabelas no DB que tratam deste item: 
      - Pesquisas: Centraliza o ciclo de vida do estudo, prazos, registro oficial no TSE (PesqEle) e a trava de lacração criptográfica.
      - Candidatos_Produtos: Mantém o catálogo de candidatos, partidos, marcas ou produtos testados, incluindo fotos e cores de destaque.
      - Cenarios_Pesquisa: Define as modalidades de avaliação da pesquisa (espontânea, estimulada, rejeição ou confronto direto).
      - Cenario_Candidatos: Associa quais candidatos ou produtos compõem cada cartela de cenário e sua ordem base de exibição.
4. **Catálogo de Perguntas, Escalas e Questionários: QUESTIONÁRIOS (`questions`):**
   - Banco canônico de enunciados, matrizes e formulação dinâmica de instrumentos CAPI.
   - Tabelas no DB que tratam deste item:
      - Perguntas_Grupos_Opcoes: Padroniza réguas de resposta reutilizáveis (como escalas Likert, aprovação ou respostas binárias).
      - Opcoes_Resposta: Armazena as alternativas individuais de cada régua (rótulo, valor numérico e cor).
      - Perguntas: Repositório canônico de enunciados e tipos lógicos de questão (única, múltipla, matriz, ranking ou texto).
      - Perguntas_Itens_Bateria: Registra os subitens avaliados em perguntas do tipo matriz ou bateria (ex.: Saúde, Educação, Asfalto).
      - Questionarios: Representa o formulário estruturado e versionado vinculado a uma pesquisa específica.
      - Questionario_Perguntas: Ordena as questões no formulário e define o formato visual (disco digital, radio group), limites de seleção e saltos lógicos. 
5. **Usuários, Equipes de Campo, Transferências e Chave Master: ADMINISTRAÇÃO (`administrator`):**
   - Controle de identidades, descentralização de cotas e trilhas de auditoria imutáveis.
   - Tabelas no DB que tratam deste item:
      - Usuarios: Gerencia os operadores administrativos, coordenadores, auditores e detentores da Chave Master.
      - Profissionais: Cadastra os responsáveis técnicos (estatísticos com CONRE) e a equipe de campo (supervisores e entrevistadores).
      - Atribuicao_Pesquisadores: Distribui as metas de entrevistas por pesquisador, bairro e setor de coleta.
      - Transferencias_Atribuicao: Registra o repasse transacional de saldos de metas pendentes entre pesquisadores.
      - Historico_Reatribuicao_Questionarios: Mantém a trilha de auditoria imutável quando a autoria de uma entrevista concluída é corrigida.
      - Historico_Desbloqueio_Pesquisas: Grava o log auditável de reaberturas emergenciais de pesquisas lacradas feitas via Chave Master.
6. **Execução de Campo, Fato Analítico e Tabulação: TABULAÇÃO (`regions`):**
   - Coleta presencial auditada, ponderação estatística e persistência de cruzamentos.   
   - Tabelas no DB que tratam deste item:
      - Pessoas: Armazena o perfil sociodemográfico anonimizado de cada eleitor ou consumidor entrevistado.
      - Questionarios_Pessoas: Registra cada sessão de entrevista aplicada, contendo geolocalização (GPS), duração, peso amostral e status de auditoria.
      - Respostas: Tabela fato atômica que persiste cada escolha, voto ou avaliação individual fornecida pelo respondente.
      - Relatorios_Tabulacao: Salva as configurações de cruzamentos estatísticos (crosstabs) e filtros personalizados para emissão de relatórios.  

## 3. Requisitos Não-Funcionais Inegociáveis
- **Precisão Numérica:** Proibido usar ponto flutuante binário (`float`) para cálculos estatísticos, pesos amostrais, percentuais de cotas ou valores financeiros — uso obrigatório de `NUMERIC(19, 4)` no PostgreSQL e `Decimal` no Python.
- **Integridade Transacional e Concorrência:** Operações críticas de alocação de cotas e sincronização em lote utilizam controle transacional estrito, `SELECT ... FOR UPDATE` e chave de idempotência.
- **Observabilidade e Padrão de Erros:** Respostas de erro seguem RFC 7807 (`Problem Details`) com `correlation_id` propagado em logs estruturados JSON (`structlog`).
