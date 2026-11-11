# OrderFlow - Sistema de Gestão e Controle de Pedidos

> Trabalho Prático da disciplina de **Desenvolvimento Web I**  
> **Universidade do Contestado (UnC)**  
> **Curso:** Engenharia de Software  

---

## 📌 1. Objetivo do Projeto
O **OrderFlow** é uma aplicação web front-end responsiva e interativa desenvolvida para gerenciar o fluxo comercial de pedidos de vendas. O sistema centraliza o cadastro de clientes, catálogo de produtos em estoque, controle de pedidos de ponta a ponta e emissão de métricas financeiras operacionais. Toda a solução opera no lado do cliente utilizando HTML5 semântico, estilização com CSS3/Bootstrap, JavaScript puro (Vanilla JS) para a lógica de negócio e persistência integral no `localStorage` do navegador, sem dependência de back-end.

---

## 👥 2. Integrantes da Equipe e Divisão de Responsabilidades

| Integrante | Papel Principal | Foco no Projeto |
| :--- | :--- | :--- |
| **Henrique M. Jakubiak** | UI/UX & Estrutura Front-end | Estrutura semântica HTML5, responsividade e layout com Bootstrap/CSS, biblioteca de componentes visuais e alternador de tema. |
| **Gregory L. Guths** | Lógica de Negócio & Dados | Arquitetura de dados, manipulação do `localStorage`, Dashboard dinâmico, validações, máquina de estados dos pedidos e simulador de checkout. |

### 🛠️ Detalhamento de Tarefas por Integrante

#### **Henrique M. Jakubiak**
* **Estrutura e Telas (`index.html`):** Montagem das 5 seções principais da aplicação (Dashboard, Clientes, Produtos, Pedidos e Emissor/Simulador) em navegação dinâmica por abas (R01, R02).
* **Estilização e Responsividade (`css/styles.css`):** Construção da interface com layout fluido (Bootstrap grid + CSS personalizado), garantindo usabilidade total em telas móveis e desktop (R02, R04).
* **Biblioteca de Componentes:** Estruturação dos componentes visuais: Navbar de navegação responsiva, Cards de estatísticas e produtos, Tabelas zebradas de listagem, Modais interativos e Alertas/Toasts dinâmicos (R03).
* **Identidade Visual e Layout:** Organização da tipografia, hierarquia visual, paleta de cores institucional e aplicação correta de classes utilitárias do Bootstrap (R04).
* **Interações de Interface:** Estruturação do modal de confirmação de exclusão e implementação visual da alternância entre modo claro e escuro (Dark/Light mode) (R12).

#### **Gregory L. Guths**
* **Persistência e CRUD (`js/storage.js` e `js/app.js`):** Implementação dos métodos de criação, listagem, atualização e exclusão das entidades com serialização em JSON no `localStorage` (R05, R08).
* **Relacionamento de Entidades:** Construção da associação dinâmica entre `Clientes`, `Produtos` e `Pedidos` (preenchimento automático de valores, baixa automática de estoque e controle de integridade) (R06).
* **Validações e Feedbacks (`js/validacoes.js`):** Validação de campos obrigatórios, formato de entradas, verificação de disponibilidade de estoque e emissão de mensagens contextuais (R07).
* **Filtragem e Ordenação:** Lógica de busca textual em tempo real, dois filtros combináveis (por status e categoria) e ordenação dinâmica por valor monetário ou data (R09).
* **Métricas do Dashboard (`js/dashboard.js`):** Programação dos 4 KPIs calculados dinamicamente via métodos funcionais de array (`reduce`, `filter`, `map`): Faturamento Total, Ticket Médio, Total de Pedidos Concluídos e Produto Mais Vendido (R10).
* **Ciclo de Estados e Checkout (`js/calculadora.js`):**
  * Máquina de estados: transição controlada de status (`Pendente` $\rightarrow$ `Em Processamento` $\rightarrow$ `Enviado` $\rightarrow$ `Entregue` / `Cancelado`) com travas lógicas (R11).
  * Funcionalidade exclusiva: **Simulador e Emissor de Pedido com Cálculo Dinâmico** (aplicação de cupons de desconto progressivos, cálculo de frete por faixa/região e espelho para emissão do pedido) (R13).

---

## 📋 3. Mapeamento dos Requisitos Mínimos (R01 a R13)

| Requisito | Descrição | Onde foi Implementado | Responsável Principal |
| :--- | :--- | :--- | :--- |
| **R01** | $\ge 5$ telas ou seções com navegação funcional | `index.html` (Dashboard, Clientes, Produtos, Pedidos, Emissão) | Henrique M. Jakubiak |
| **R02** | Interface responsiva, HTML semântico e CSS próprio | `index.html` com tags semânticas e `css/styles.css` (mobile first) | Henrique M. Jakubiak |
| **R03** | $\ge 5$ tipos de componentes distintos | Navbar, Cards de métricas, Tabelas, Modais e Toasts/Alertas | Henrique M. Jakubiak |
| **R04** | Bootstrap ou Tailwind CSS integrado ao layout | Bootstrap 5 no layout base + classes e variáveis em `css/styles.css` | Henrique M. Jakubiak |
| **R05** | CRUD completo com dados dinâmicos no DOM | `js/app.js` e `js/storage.js` (gerenciamento das entidades) | Gregory L. Guths |
| **R06** | 3 entidades relacionadas | `Clientes`, `Produtos` e `Pedidos` (dedução e checagem de estoque) | Gregory L. Guths |
| **R07** | Validação de formulários e mensagens de feedback | `js/validacoes.js` (validação de inputs e regras de entrada) | Gregory L. Guths |
| **R08** | Persistência e restauração via `localStorage` | `js/storage.js` (recuperação e gravação com `JSON.parse`/`stringify`) | Gregory L. Guths |
| **R09** | Busca, 2 filtros combináveis e ordenação | `js/app.js` (busca por texto, filtro de status/categoria, ordenação) | Gregory L. Guths |
| **R10** | Dashboard com 4 indicadores calculados | `js/dashboard.js` (Faturamento, Ticket Médio, Pedidos, Mais Vendido) | Gregory L. Guths |
| **R11** | Alteração de estado com regra de negócio | `js/app.js` (Pendente $\rightarrow$ Processando $\rightarrow$ Enviado $\rightarrow$ Entregue) | Gregory L. Guths |
| **R12** | 3 interações adicionais em JavaScript | Modal de exclusão, toasts animados e alternância Dark/Light mode | Ambos |
| **R13** | Funcionalidade exclusiva com lógica JS | `js/calculadora.js` (Cupom de desconto, frete escalonado e espelho) | Gregory L. Guths |

---

## 🗂️ 4. Estrutura de Pastas e Arquivos

```text
orderflow/
├── index.html              # Interface principal com as 5 seções do sistema
├── README.md               # Documentação técnica e divisão de papéis
├── css/
│   └── styles.css          # Estilização própria, variáveis e temas
├── js/
│   ├── app.js              # Controlador principal da DOM e navegação
│   ├── storage.js          # CRUD e persistência no localStorage
│   ├── validacoes.js       # Validação de formulários e regras de entrada
│   ├── dashboard.js        # Agregações numéricas e cálculo dos 4 KPIs
│   └── calculadora.js      # Lógica exclusiva: frete dinâmico, descontos e comprovante
└── assets/
    └── img/                # Recursos gráficos e logotipos
```