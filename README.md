# OrderFlow — Sistema de Gestão de Pedidos

> **Trabalho acadêmico — Desenvolvimento Web I**  
> **Universidade do Contestado (UnC)**  
> **Curso:** Engenharia de Software

## Apresentação

O OrderFlow é uma aplicação web front-end para apoiar o gerenciamento de clientes, produtos e pedidos. O sistema permite acompanhar o fluxo dos pedidos, consultar indicadores de vendas e simular a criação de uma compra com cálculo de frete e descontos.

O projeto foi desenvolvido com HTML, CSS e JavaScript, sem servidor ou banco de dados. As informações são armazenadas no `localStorage` do navegador, de modo que a aplicação demonstra conceitos de persistência no cliente, manipulação do DOM e implementação de regras de negócio.

## Objetivos

### Objetivo geral

Desenvolver uma aplicação web que demonstre a construção de uma interface interativa para gerenciamento de pedidos, utilizando tecnologias front-end e armazenamento local.

### Objetivos específicos

- Organizar a interface em páginas para as principais áreas do sistema.
- Implementar operações de cadastro, consulta, edição e exclusão de clientes e produtos.
- Relacionar pedidos a clientes e produtos e atualizar o estoque de acordo com as operações realizadas.
- Validar os dados informados e apresentar mensagens de feedback.
- Persistir e recuperar os dados utilizando `localStorage`.
- Aplicar regras de cálculo de subtotal, frete, descontos e total dos pedidos.
- Apresentar indicadores resumidos de pedidos e vendas no dashboard.

## Escopo e funcionalidades

- **Dashboard:** indicadores de vendas, pedidos por status e pedidos recentes.
- **Clientes:** cadastro, edição, busca e exclusão de clientes.
- **Produtos:** cadastro, edição, busca, filtros de categoria e estoque, e exclusão.
- **Pedidos:** consulta, busca, filtros, ordenação e atualização de status.
- **Novo pedido:** seleção de cliente e produtos, carrinho, região de entrega, forma de pagamento, cupom e cálculo dos valores.
- **Persistência local:** armazenamento dos dados no navegador por meio do `localStorage`.

O projeto é demonstrativo e não possui back-end, autenticação ou sincronização entre dispositivos. Os dados permanecem no navegador utilizado e podem ser removidos ao limpar os dados locais do site.

## Tecnologias e recursos

- HTML5 para a estrutura das páginas.
- CSS3 para a apresentação visual e responsividade.
- JavaScript puro (Vanilla JS) para interações, validações e regras de negócio.
- Bootstrap 5 e Bootstrap Icons, carregados por CDN.
- `localStorage` para persistência dos dados no navegador.

Como Bootstrap e Bootstrap Icons são carregados por CDN, é necessária uma conexão com a internet para carregar esses recursos externos.

## Organização do projeto

```text
overFlow/
├── README.md
├── index.html              # Dashboard
├── clientes.html           # Gestão de clientes
├── novo-pedido.html        # Criação de pedidos
├── pedidos.html            # Consulta e gestão de pedidos
├── produtos.html           # Gestão de produtos
├── css/
│   └── styles.css          # Estilos da aplicação
├── js/
│   ├── app.js              # Interações da interface e renderização
│   ├── calculadora.js      # Cálculos de pedidos, frete e cupons
│   ├── dashboard.js        # Cálculo dos indicadores do dashboard
│   ├── storage.js          # Operações e persistência no localStorage
│   └── validacoes.js       # Validações de clientes, produtos e pedidos
└── wireframes/
    ├── clientes.html
    ├── inicio.html
    ├── novo-pedido.html
    ├── pedidos.html
    └── produtos.html
```

## Como executar

1. Faça o download ou clone este repositório.
2. Abra a pasta do projeto no Visual Studio Code.
3. Inicie um servidor local, por exemplo, com a extensão **Live Server**.
4. Abra `index.html` pelo servidor local e navegue pelas opções do sistema.

Também é possível abrir `index.html` diretamente no navegador. O uso de um servidor local é recomendado para manter um contexto de execução consistente entre as páginas.

## Requisitos do trabalho

| Código | Requisito | Implementação no projeto |
| :--- | :--- | :--- |
| **R01** | Múltiplas telas com navegação funcional | Páginas de dashboard, clientes, produtos, pedidos e criação de pedido. |
| **R02** | Interface responsiva, HTML semântico e CSS próprio | Páginas HTML e estilos em `css/styles.css`. |
| **R03** | Componentes visuais distintos | Navegação, cards, tabelas, modais e notificações. |
| **R04** | Framework ou biblioteca de estilos | Bootstrap 5 integrado às páginas. |
| **R05** | CRUD com atualização dinâmica da interface | `js/app.js` e `js/storage.js`. |
| **R06** | Relacionamento entre entidades | Clientes, produtos e pedidos. |
| **R07** | Validação de formulários e feedback | `js/validacoes.js` e notificações da interface. |
| **R08** | Persistência e recuperação de dados | `localStorage`, implementado em `js/storage.js`. |
| **R09** | Busca, filtros e ordenação | Controles de consulta implementados em `js/app.js`. |
| **R10** | Indicadores calculados no dashboard | Resumos calculados em `js/dashboard.js`. |
| **R11** | Alteração de estado com regras de negócio | Transições de status em `js/app.js` e `js/storage.js`. |
| **R12** | Interações adicionais com JavaScript | Modais, notificações e controles interativos. |
| **R13** | Funcionalidade adicional com lógica JavaScript | Cálculo de frete, descontos e valores em `js/calculadora.js`. |

## Integrantes e responsabilidades

| Integrante | Responsabilidades principais |
| :--- | :--- |
| **Henrique M. Jakubiak** | Estrutura das páginas, interface, componentes visuais e responsividade. |
| **Gregory L. Guths** | Persistência local, validações, regras de negócio, dashboard e fluxo de pedidos. |

## Considerações finais

O OrderFlow reúne conceitos fundamentais do desenvolvimento front-end em uma aplicação prática. A separação entre páginas, estilos e módulos JavaScript facilita a compreensão do projeto e evidencia como a interface, os dados armazenados localmente e as regras de negócio se relacionam.
