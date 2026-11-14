(() => {
  /**
   * Busca um elemento único no DOM para facilitar a leitura do código e evitar repetição.
   * @param {string} seletor Seletor CSS do elemento desejado.
   * @returns {Element|null} Elemento encontrado ou null quando não existe.
   */
  const obterElemento = (seletor) => document.querySelector(seletor);

  /**
   * Registra um listener em um elemento do DOM quando ele existir.
   * Essa função reduz a repetição de validações de presença antes de adicionar eventos.
   * @param {string} seletor Seletor CSS do elemento alvo.
   * @param {string} evento Nome do evento a ser escutado.
   * @param {Function} manipulador Função executada quando o evento for disparado.
   */
  const escutarEvento = (seletor, evento, manipulador) => {
    const elemento = obterElemento(seletor);
    if (elemento) elemento.addEventListener(evento, manipulador);
  };
  const loja = window.OrderFlowStorage;
  const regras = window.OrderFlowValidation;
  const calculadora = window.OrderFlowCalculator;
  const statuses = [
    ["Entregue", "Entregues", "progress-delivered"],
    ["Em processamento", "Em andamento", "progress-processing"],
    ["Enviado", "Enviado", "progress-processing"],
    ["Pendente", "Pendentes", "progress-pending"],
    ["Cancelado", "Cancelados", "progress-cancelled"],
  ];
  const statusClasses = {
    Pendente: "status-pending",
    "Em processamento": "status-processing",
    Enviado: "status-processing",
    Entregue: "status-delivered",
    Cancelado: "status-cancelled",
  };
  const nextStates = {
    Pendente: ["Em processamento", "Cancelado"],
    "Em processamento": ["Enviado", "Cancelado"],
    Enviado: ["Entregue", "Cancelado"],
    Entregue: [],
    Cancelado: [],
  };
  const fields = { customer: ["name", "email", "phone"], product: ["name", "price", "stock", "category"] };
  let carrinho = [];
  let cupom = "";
  let alvoExclusao = null;

  /**
   * Escapa caracteres especiais para renderizar conteúdo textual em HTML com segurança.
   * Isso evita que entradas do usuário quebrem a estrutura da página ou causem injeção de marcação.
   * @param {any} valor Conteúdo que será exibido no navegador.
   * @returns {string} Texto convertido em uma versão segura para HTML.
   */
  const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>\"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caractere]);

  /**
   * Formata valores monetários em reais usando a mesma regra da calculadora do sistema.
   * @param {number|string} valor Valor que deve aparecer em moeda.
   * @returns {string} Valor formatado em moeda brasileira.
   */
  const moeda = (valor) => calculadora.formatarMoeda(valor);

  /**
   * Busca o nome do cliente pelo identificador informado.
   * Quando o cliente não existe mais, retorna uma mensagem amigável para não quebrar a UI.
   * @param {string} id Identificador do cliente.
   * @param {Array<Object>} [clientes=loja.get("customers")] Lista de clientes em memória.
   * @returns {string} Nome do cliente ou texto fallback.
   */
  const nomeCliente = (id, clientes = loja.get("customers")) =>
    clientes.find((cliente) => cliente.id === id)?.name || "Cliente removido";

  /**
   * Cria o componente visual de status usado em tabelas e listas do painel.
   * @param {string} status Texto representando o estado do pedido.
   * @returns {string} HTML do emblemaStatus com a classe correta.
   */
  const emblemaStatus = (status) => `<span class="status-badge ${statusClasses[status] || ""}">${escaparHtml(status)}</span>`;

  /**
   * Gera a linha de tabela vazia quando a lista não possui nenhum registro.
   * Esse helper centraliza a mensagem e o comportamento padrão de estado vazio da interface.
   * @param {string} linhas HTML já gerado para as linhas da tabela.
   * @param {string} mensagem Texto exibido quando não há registros.
   * @param {number} colunas Quantidade de colunas do contexto da tabela.
   * @param {string} [acao=""] HTML opcional para ação complementar da linha vazia.
   * @returns {string} HTML da tabela preenchida ou mensagem de lista vazia.
   */
  const linhasVazias = (linhas, mensagem, colunas, acao = "") => linhas ||
    `<tr><td class="empty-table-cell" colspan="${colunas}">${escaparHtml(mensagem)}${acao}</td></tr>`;

  /**
   * Produz os botões de ação da linha de cada registro, como editar e excluir.
   * Esse helper padroniza a interação em clientes, produtos e pedidos.
   * @param {string} entidade Nome da entidade que será editada.
   * @param {string} id Identificador do item atual.
   * @param {string} nome Nome do item para melhorar a acessibilidade.
   * @returns {string} HTML com os botões de ação encapsulados.
   */
  const botoesAcao = (entidade, id, nome) => {
    const singular = entidade === "customers" ? "customer" : entidade === "products" ? "product" : "order";
    return `<div class="row-actions">
      <button class="row-action" data-action="edit-${singular}" data-id="${escaparHtml(id)}" aria-label="Editar ${escaparHtml(nome)}"><i class="bi bi-pencil"></i></button>
      <button class="row-action" data-action="delete-${singular}" data-id="${escaparHtml(id)}" aria-label="Excluir ${escaparHtml(nome)}"><i class="bi bi-trash"></i></button>
    </div>`;
  };

  /**
   * Cria uma notificação visual de sucesso ou erro para o usuário.
   * A mensagem aparece no canto inferior da tela e desaparece automaticamente.
   * @param {string} mensagem Conteúdo exibido no toast.
   * @param {boolean} [erro=false] Indica se a mensagem deve ter estilo de erro.
   */
  const notificar = (mensagem, erro = false) => {
    const elemento = document.createElement("div");
    elemento.className = `toast app-toast align-items-center border-0 ${erro ? "toast-error" : ""}`;
    elemento.setAttribute("role", erro ? "alert" : "status");
    elemento.innerHTML = `<div class="d-flex"><div class="toast-body">${escaparHtml(mensagem)}</div><button class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>`;
    obterElemento("#toast-container").append(elemento);
    elemento.addEventListener("hidden.bs.toast", () => elemento.remove(), { once: true });
    bootstrap.Toast.getOrCreateInstance(elemento, { delay: 3500 }).show();
  };

  /**
   * Centraliza a execução de ações que podem falhar e transforma exceções em feedback visual.
   * Esse guard é importante para manter a interface responsiva e evitar que uma falha pare o app.
   * @param {Function} callback Função executada com tratamento de erro.
   */
  const executarComTratamento = (callback) => {
    try { callback(); }
    catch (erro) {
      console.error(erro);
      notificar(erro.message || "Não foi possível concluir a operação.", true);
    }
  };

  /**
   * Converte uma data em um formato amigável para o usuário brasileiro.
   * @param {string|Date} valor Data que deve ser exibida na tela.
   * @returns {string} Data formatada em dia/mes/ano em português.
   */
  const formatarData = (valor) => new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(valor)).replace(".", "");


  /**
   * Atualiza o painel inicial com indicadores de faturamento, status e pedidos recentes.
   * Essa função reprocessa os dados do armazenamento e refaz os cards do dashboard em tempo real.
   */
  function renderizarDashboard() {
    const orders = loja.get("orders");
    const stats = window.OrderFlowDashboard.summarize(orders);
    const pendingCount = obterElemento("#pending-count");
    if (pendingCount) pendingCount.textContent = stats.countByStatus.Pendente +
      stats.countByStatus["Em processamento"] + stats.countByStatus.Enviado;
    if (!obterElemento("#kpi-revenue")) return;
    obterElemento("#kpi-revenue").textContent = moeda(stats.revenue);
    obterElemento("#kpi-average").textContent = moeda(stats.average);
    obterElemento("#kpi-completed").textContent = stats.completedCount;
    obterElemento("#kpi-top-product").textContent = stats.topProduct?.[0] || "—";
    obterElemento("#kpi-top-product-detail").textContent = stats.topProduct
      ? `${stats.topProduct[1]} unidade(s) vendida(s)` : "Ainda não há vendas";
    obterElemento("#status-progress").innerHTML = statuses.map(([status, , color]) =>
      `<div class="progress-bar ${color}" style="width:${stats.totalOrders ? stats.countByStatus[status] / stats.totalOrders * 100 : 0}%"></div>`
    ).join("");
    obterElemento("#status-list").innerHTML = statuses.map(([status, label]) => {
      const count = stats.countByStatus[status];
      const percent = stats.totalOrders ? Math.round(count / stats.totalOrders * 100) : 0;
      return `<li class="list-group-item d-flex justify-content-between px-0"><span>${label}</span><span class="text-secondary">${count} · ${percent}%</span></li>`;
    }).join("");
    const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    obterElemento("#recent-orders").innerHTML = linhasVazias(recent.map((order) =>
      `<tr><td>#${escaparHtml(order.number)}</td><td>${escaparHtml(nomeCliente(order.customerId))}</td><td>${moeda(order.total)}</td><td>${emblemaStatus(order.status)}</td></tr>`
    ).join(""), "Nenhum pedido cadastrado.", 4,
    '<a class="btn btn-link btn-sm" href="novo-pedido.html">Criar pedido</a>');
    obterElemento("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());
  }

  /**
   * Renderiza a tabela de clientes com filtros por texto e cálculo do faturamento entregue.
   * Também atualiza o contador e a combinação de dados de histórico para cada cliente.
   */
  function renderizarClientes() {
    if (!obterElemento("#customer-search")) return;
    const query = obterElemento("#customer-search").value.trim().toLocaleLowerCase("pt-BR");
    const orders = loja.get("orders");
    const customers = loja.get("customers").filter((customer) =>
      `${customer.name} ${customer.email}`.toLocaleLowerCase("pt-BR").includes(query)
    ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    obterElemento("#customers-count").textContent = `${customers.length} cliente(s)`;
    const rows = customers.map((customer) => {
      const history = orders.filter((order) => order.customerId === customer.id && order.status !== "Cancelado");
      const delivered = history.filter((order) => order.status === "Entregue")
        .reduce((sum, order) => sum + order.total, 0);
      return `<tr><td>${escaparHtml(customer.name)}</td><td>${escaparHtml(customer.email)}</td><td>${escaparHtml(customer.phone || "—")}</td>
        <td>${history.length}</td><td>${moeda(delivered)}</td><td>${botoesAcao("customers", customer.id, customer.name)}</td></tr>`;
    }).join("");
    obterElemento("#customers-list").innerHTML = linhasVazias(rows, "Nenhum cliente encontrado.", 6);
  }

  /**
   * Monta a visão de catálogo de produtos com busca, categoria e nível de estoque.
   * A função calcula o estado do produto e exibe a lista em formato de tabela.
   */
  function renderizarProdutos() {
    if (!obterElemento("#product-search")) return;
    const query = obterElemento("#product-search").value.trim().toLocaleLowerCase("pt-BR");
    const category = obterElemento("#category-filter").value;
    const stockFilter = obterElemento("#stock-filter").value;
    const products = loja.get("products").filter((product) =>
      `${product.name} ${product.category} ${product.sku}`.toLocaleLowerCase("pt-BR").includes(query) &&
      (!category || product.category === category) &&
      (!stockFilter || (stockFilter === "available" ? product.stock > 8 :
        stockFilter === "low" ? product.stock > 0 && product.stock <= 8 : product.stock === 0))
    ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    obterElemento("#products-count").textContent = `${products.length} produto(s)`;
    const rows = products.map((product) => {
      const [label, style] = product.stock === 0 ? ["Sem estoque", "status-cancelled"]
        : product.stock <= 8 ? ["Estoque baixo", "status-pending"] : ["Disponível", "status-delivered"];
      return `<tr><td>${escaparHtml(product.name)}</td><td>${escaparHtml(product.category)}</td><td>${escaparHtml(product.sku || "—")}</td>
        <td>${product.stock}</td><td>${moeda(product.price)}</td><td><span class="status-badge ${style}">${label}</span></td>
        <td>${botoesAcao("products", product.id, product.name)}</td></tr>`;
    }).join("");
    obterElemento("#products-list").innerHTML = linhasVazias(rows, "Nenhum produto encontrado.", 7);
  }

  /**
   * Exibe a lista de pedidos com campos de busca, filtro por status e ordenação.
   * Também atualiza o contador total e insere as opções de alteração de status em linha.
   */
  function renderizarPedidos() {
    if (!obterElemento("#order-search")) return;
    const query = obterElemento("#order-search").value.trim().toLocaleLowerCase("pt-BR");
    const status = obterElemento("#order-status-filter").value;
    const sort = obterElemento("#order-sort").value;
    const customers = loja.get("customers");
    const orders = loja.get("orders").filter((order) =>
      `${order.number} ${nomeCliente(order.customerId, customers)}`.toLocaleLowerCase("pt-BR").includes(query) &&
      (!status || order.status === status)
    );
    const dateOrder = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    orders.sort(sort === "oldest" ? dateOrder : sort === "highest" ? (a, b) => b.total - a.total
      : sort === "lowest" ? (a, b) => a.total - b.total : (a, b) => dateOrder(b, a));
    const rows = orders.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const choices = nextStates[order.status] || [];
      return `<tr><td>#${escaparHtml(order.number)}</td><td>${escaparHtml(nomeCliente(order.customerId, customers))}</td><td>${formatarData(order.createdAt)}</td>
        <td>${itemCount}</td><td>${moeda(order.total)}</td><td><select class="form-select form-select-sm status-select ${statusClasses[order.status]}" data-action="status" data-id="${escaparHtml(order.id)}" aria-label="Status do pedido ${escaparHtml(order.number)}"><option selected>${escaparHtml(order.status)}</option>${choices.map((option) => `<option>${escaparHtml(option)}</option>`).join("")}</select></td>
        <td><div class="row-actions"><button class="row-action" data-action="details" data-id="${escaparHtml(order.id)}" aria-label="Ver pedido ${escaparHtml(order.number)}"><i class="bi bi-eye"></i></button><button class="row-action" data-action="delete-order" data-id="${escaparHtml(order.id)}" aria-label="Excluir pedido ${escaparHtml(order.number)}"><i class="bi bi-trash"></i></button></div></td></tr>`;
    }).join("");
    obterElemento("#orders-list").innerHTML = linhasVazias(rows, "Nenhum pedido encontrado.", 7);
    obterElemento("#orders-count").textContent = `${orders.length} pedido(s)`;
  }

  /**
   * Preenche os selects do formulário de pedido com os clientes e produtos disponíveis.
   * Mantém o valor atual selecionado quando a página for re-renderizada.
   */
  function renderizarOpcoesPedido() {
    if (!obterElemento("#order-customer") || !obterElemento("#order-product")) return;
    const customers = loja.get("customers");
    const products = loja.get("products").filter((product) => product.stock > 0);
    const selected = ["#order-customer", "#order-product"].map((selector) => obterElemento(selector).value);
    obterElemento("#order-customer").innerHTML = `<option value="" disabled ${selected[0] ? "" : "selected"}>Selecione um cliente</option>` +
      customers.map((customer) => `<option value="${escaparHtml(customer.id)}">${escaparHtml(customer.name)} — ${escaparHtml(customer.email)}</option>`).join("");
    obterElemento("#order-product").innerHTML = `<option value="" disabled ${selected[1] ? "" : "selected"}>Selecione um produto</option>` +
      products.map((product) => `<option value="${escaparHtml(product.id)}">${escaparHtml(product.name)} — ${moeda(product.price)} (${product.stock} un.)</option>`).join("");
    if (customers.some((customer) => customer.id === selected[0])) obterElemento("#order-customer").value = selected[0];
    if (products.some((product) => product.id === selected[1])) obterElemento("#order-product").value = selected[1];
  }

  /**
   * Recalcula o resumo do carrinho de compras e atualiza os valores visuais do pedido.
   * Também aplica os textos de feedback do cupom e atualiza o subtotal e total da operação.
   */
  function renderizarCarrinho() {
    if (!obterElemento("#order-form")) return;
    const totals = calculadora.calculate(carrinho, obterElemento("#shipping-region").value, cupom);
    obterElemento("#order-items").innerHTML = carrinho.length ? carrinho.map((item, index) => `
      <div class="carrinho-item"><div class="carrinho-item-info"><strong>${escaparHtml(item.name)}</strong><small>${moeda(item.price)}</small></div>
      <div class="carrinho-item-controls"><button class="quantity-button" data-action="quantity-down" data-index="${index}" type="button" aria-label="Diminuir">−</button><span>${item.quantity}</span><button class="quantity-button" data-action="quantity-up" data-index="${index}" type="button" aria-label="Aumentar">+</button><button class="row-action remove-item" data-action="remove-item" data-index="${index}" type="button" aria-label="Remover"><i class="bi bi-trash"></i></button></div></div>`
    ).join("") : '<p class="text-secondary small py-3 mb-0">Nenhum produto adicionado.</p>';
    obterElemento("#items-subtotal").textContent = moeda(totals.subtotal);
    obterElemento("#summary-subtotal").textContent = moeda(totals.subtotal);
    obterElemento("#summary-shipping").textContent = moeda(totals.shipping);
    obterElemento("#summary-discount").textContent = `− ${moeda(totals.discount)}`;
    obterElemento("#summary-total").textContent = moeda(totals.total);
    obterElemento("#coupon-feedback").textContent = totals.couponMessage;
    obterElemento("#coupon-feedback").className = `small ${totals.couponMessage.startsWith("Cupom aplicado") ? "coupon-success" :
      totals.couponMessage ? "coupon-error" : ""}`;
  }

  /**
   * Recarrega todas as áreas principais da aplicação em um único ponto de atualização.
   * Essa função centraliza os renderizadores para evitar repetições de código.
   */
  function atualizarTela() {
    renderizarDashboard();
    renderizarClientes();
    renderizarProdutos();
    renderizarPedidos();
    renderizarOpcoesPedido();
  }

  /**
   * Limpa um formulário de cadastro e redefine o modal para o estado de criação.
   * @param {string} entity Tipo da entidade que está sendo resetada: cliente ou produto.
   */
  function reiniciarFormulario(entity) {
    const form = obterElemento(`#${entity}-form`);
    form.reset();
    delete form.dataset.editId;
    obterElemento(`#${entity}-modal-title`).textContent = `Novo ${entity === "customer" ? "cliente" : "produto"}`;
  }

  /**
   * Preenche o modal de edição com os dados de um registro existente.
   * @param {string} entity Entidade sendo editada, como cliente ou produto.
   * @param {string} id Identificador do registro que deve ser carregado.
   */
  function editarRegistro(entity, id) {
    const records = loja.get(entity === "customer" ? "customers" : "products");
    const record = records.find((item) => item.id === id);
    if (!record) throw new Error("Registro não encontrado.");
    const form = obterElemento(`#${entity}-form`);
    form.dataset.editId = id;
    fields[entity].forEach((field) => { obterElemento(`#${entity}-${field}`).value = record[field] ?? ""; });
    obterElemento(`#${entity}-modal-title`).textContent = `Editar ${entity === "customer" ? "cliente" : "produto"}`;
    bootstrap.Modal.getOrCreateInstance(obterElemento(`#${entity}-modal`)).show();
  }

  /**
   * Valida a exclusão de um registro e abre o modal de confirmação.
   * A função impede remoções que violam regras de integridade do sistema, como cliente com pedidos ativos.
   * @param {string} entity Tipo da entidade que será removida.
   * @param {string} id Identificador do item a ser excluído.
   */
  function perguntarExclusao(entity, id) {
    const names = { customers: "cliente", products: "produto", orders: "pedido" };
    if (!loja.get(entity).some((item) => item.id === id)) throw new Error("Registro não encontrado.");
    if (entity === "customers" && loja.get("orders").some((order) => order.customerId === id))
      throw new Error("Não é possível excluir um cliente que tem pedidos no histórico.");
    if (entity === "products" && loja.get("orders").some((order) =>
      order.items.some((item) => item.productId === id)))
      throw new Error("Não é possível excluir um produto que aparece em pedidos.");
    alvoExclusao = { entity, id };
    obterElemento("#delete-modal-message").textContent = `Deseja excluir este ${names[entity]}?`;
    bootstrap.Modal.getOrCreateInstance(obterElemento("#delete-modal")).show();
  }

  /**
   * Centraliza a execução das ações disparadas pelos botões e controles da interface.
   * Ele interpreta o evento do elemento e chama o comportamento adequado, como editar, excluir, detalhar ou alterar quantidade.
   * @param {{ action: string, id?: string, index?: string }} actionData Dados do clique ou interação que disparou a ação.
   */
  function executarAcao({ action, id, index }) {
    if (action === "edit-customer") return editarRegistro("customer", id);
    if (action === "edit-product") return editarRegistro("product", id);
    if (action === "delete-customer") return perguntarExclusao("customers", id);
    if (action === "delete-product") return perguntarExclusao("products", id);
    if (action === "delete-order") return perguntarExclusao("orders", id);
    if (action === "add-customer" || action === "add-product") {
      const entity = action === "add-customer" ? "customer" : "product";
      reiniciarFormulario(entity);
      return bootstrap.Modal.getOrCreateInstance(obterElemento(`#${entity}-modal`)).show();
    }
    if (action === "details") {
      const order = loja.get("orders").find((item) => item.id === id);
      if (order) window.alert(`${order.number}\n${order.items.map((item) => `${item.quantity} × ${item.name}`).join("\n")}\n\nTotal: ${moeda(order.total)}\nPagamento: ${order.payment}`);
      return;
    }
    if (["remove-item", "quantity-up", "quantity-down"].includes(action)) {
      const item = carrinho[Number(index)];
      if (!item) return;
      if (action === "remove-item") carrinho.splice(Number(index), 1);
      else if (action === "quantity-up") {
        const product = loja.get("products").find((entry) => entry.id === item.productId);
        if (!product || item.quantity >= product.stock) throw new Error("A quantidade excede o estoque disponível.");
        item.quantity += 1;
      } else if (item.quantity > 1) item.quantity -= 1;
      renderizarCarrinho();
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    executarComTratamento(() => executarAcao(button.dataset));
  });

  document.addEventListener("change", (event) => {
    const element = event.target;
    if (["category-filter", "stock-filter"].includes(element.id)) renderizarProdutos();
    if (["order-status-filter", "order-sort"].includes(element.id)) renderizarPedidos();
    if (element.id === "shipping-region") renderizarCarrinho();
    if (element.dataset.action === "status") executarComTratamento(() => {
      loja.changeOrderStatus(element.dataset.id, element.value);
      atualizarTela();
      notificar("Status do pedido atualizado.");
    });
  });

  escutarEvento("#customer-search", "input", renderizarClientes);
  escutarEvento("#product-search", "input", renderizarProdutos);
  escutarEvento("#order-search", "input", renderizarPedidos);

  /**
   * Salva um cliente ou produto após validar os campos do formulário.
   * A função decide entre atualização ou criação com base na presença de um identificador de edição.
   * @param {string} entity Entidade sendo salva.
   * @param {Event} event Evento do submit do formulário.
   */
  function salvarRegistro(entity, event) {
    event.preventDefault();
    const form = event.currentTarget;
    executarComTratamento(() => {
      const data = Object.fromEntries(fields[entity].map((field) => [field, obterElemento(`#${entity}-${field}`).value]));
      const record = entity === "customer"
        ? regras.validateCustomer(data, loja.get("customers"), form.dataset.editId || null)
        : regras.validateProduct(data);
      if (form.dataset.editId) loja.update(entity === "customer" ? "customers" : "products", form.dataset.editId, record);
      else {
        const createdAt = new Date().toISOString();
        if (entity === "customer") loja.insert("customers", { ...record, createdAt });
        else {
          const prefix = { Acessórios: "ACC", Casa: "CAS", Vestuário: "VES" }[record.category];
          const skus = loja.get("products").map((product) => product.sku);
          let sequence = skus.length + 1;
          while (skus.includes(`${prefix}-${String(sequence).padStart(3, "0")}`)) sequence += 1;
          loja.insert("products", {
            ...record, sku: `${prefix}-${String(sequence).padStart(3, "0")}`, createdAt,
          });
        }
      }
      bootstrap.Modal.getOrCreateInstance(obterElemento(`#${entity}-modal`)).hide();
      reiniciarFormulario(entity);
      atualizarTela();
      notificar(`${entity === "customer" ? "Cliente" : "Produto"} salvo com sucesso.`);
    });
  }

  escutarEvento("#customer-form", "submit", (event) => salvarRegistro("customer", event));
  escutarEvento("#product-form", "submit", (event) => salvarRegistro("product", event));

  escutarEvento("#confirm-delete", "click", () => {
    if (!alvoExclusao) return;
    executarComTratamento(() => {
      if (alvoExclusao.entity === "orders") loja.deleteOrder(alvoExclusao.id);
      else loja.remove(alvoExclusao.entity, alvoExclusao.id);
      bootstrap.Modal.getOrCreateInstance(obterElemento("#delete-modal")).hide();
      alvoExclusao = null;
      atualizarTela();
      notificar("Registro excluído.");
    });
  });

  escutarEvento("#add-product-button", "click", () => executarComTratamento(() => {
    const product = loja.get("products").find((item) => item.id === obterElemento("#order-product").value);
    const quantity = Number(obterElemento("#order-quantity").value);
    if (!product) throw new Error("Selecione um produto.");
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Informe uma quantidade válida.");
    const inCart = carrinho.find((item) => item.productId === product.id);
    if (quantity + (inCart?.quantity || 0) > product.stock)
      throw new Error("A quantidade excede o estoque disponível.");
    if (inCart) inCart.quantity += quantity;
    else carrinho.push({ productId: product.id, name: product.name, price: product.price, quantity });
    obterElemento("#order-quantity").value = "1";
    renderizarCarrinho();
  }));

  escutarEvento("#apply-coupon", "click", () => {
    const requested = obterElemento("#coupon-code").value.trim().toUpperCase();
    const totals = calculadora.calculate(carrinho, obterElemento("#shipping-region").value, requested);
    if (totals.couponMessage && !totals.couponMessage.startsWith("Cupom aplicado")) {
      cupom = "";
      renderizarCarrinho();
      obterElemento("#coupon-feedback").textContent = totals.couponMessage;
      obterElemento("#coupon-feedback").className = "small coupon-error";
      return;
    }
    cupom = requested;
    renderizarCarrinho();
  });
  escutarEvento("#coupon-code", "input", () => {
    cupom = "";
    obterElemento("#coupon-feedback").textContent = "";
    renderizarCarrinho();
  });

  escutarEvento("#order-form", "submit", (event) => {
    event.preventDefault();
    executarComTratamento(() => {
      const order = {
        customerId: obterElemento("#order-customer").value,
        items: carrinho,
        region: obterElemento("#shipping-region").value,
        payment: obterElemento("#payment-method").value,
      };
      regras.validateOrder(order, loja.get("customers"), loja.get("products"));
      const totals = calculadora.calculate(carrinho, order.region, cupom);
      if (cupom && totals.cupom !== cupom) throw new Error("O cupom informado não pode ser aplicado.");
      const now = new Date().toISOString();
      loja.createOrder({
        ...order, number: loja.nextOrderNumber(), subtotal: totals.subtotal, shipping: totals.shipping,
        discount: totals.discount, total: totals.total, cupom: totals.cupom, notes: obterElemento("#order-notes").value.trim(),
        status: "Pendente", createdAt: now, updatedAt: now,
      });
      event.currentTarget.reset();
      carrinho = [];
      cupom = "";
      obterElemento("#coupon-code").value = "";
      atualizarTela();
      renderizarCarrinho();
      notificar("Pedido criado e estoque atualizado.");
    });
  });

  escutarEvento("#customer-modal", "hidden.bs.modal", () => reiniciarFormulario("customer"));
  escutarEvento("#product-modal", "hidden.bs.modal", () => reiniciarFormulario("product"));
  escutarEvento("#delete-modal", "hidden.bs.modal", () => { alvoExclusao = null; });
  document.querySelectorAll('[data-bs-target="#customer-modal"]').forEach((button) =>
    button.addEventListener("click", () => reiniciarFormulario("customer")));
  document.querySelectorAll('[data-bs-target="#product-modal"]').forEach((button) =>
    button.addEventListener("click", () => reiniciarFormulario("product")));

  try {
    loja.seed();
    atualizarTela();
    renderizarCarrinho();
  } catch (error) {
    console.error(error);
    notificar(error.message || "Não foi possível iniciar o aplicativo.", true);
  }
})();
