/**
 * App principal do fluxo de pedidos.
 * Centraliza renderização, interações e regras de negócio do sistema.
 */
(() => {
  const $ = (seletor) => document.querySelector(seletor);
  const aoEscutar = (seletor, evento, manipulador) => { const elemento = $(seletor); if (elemento) elemento.addEventListener(evento, manipulador); };
  const loja = window.OrderFlowStorage, regras = window.OrderFlowValidation, calculadora = window.OrderFlowCalculator;
  const statusLista = [["Entregue","Entregues","progress-delivered"],["Em processamento","Em andamento","progress-processing"],["Enviado","Enviado","progress-processing"],["Pendente","Pendentes","progress-pending"],["Cancelado","Cancelados","progress-cancelled"]];
  const classesStatus = { Pendente: "status-pending", "Em processamento": "status-processing", Enviado: "status-processing", Entregue: "status-delivered", Cancelado: "status-cancelled" };
  const proximosStatus = { Pendente: ["Em processamento","Cancelado"], "Em processamento": ["Enviado","Cancelado"], Enviado: ["Entregue","Cancelado"], Entregue: [], Cancelado: [] };
  const campos = { customer: ["name","email","phone"], product: ["name","price","stock","category"] };
  let carrinho = [], cupom = "", alvoExclusao = null;

  /**
   * Escapa caracteres especiais para evitar injeção de HTML.
   * @param {any} valor Valor à ser convertido.
   * @returns {string} Texto seguro para renderização.
   */
  const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>\"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]);
  /**
   * Formata um valor em moeda brasileira.
   * @param {number|string} valor Valor a ser formatado.
   * @returns {string} Valor monetário em BRL.
   */
  const moeda = (valor) => (calculadora.formatarMoeda || calculadora.formatCurrency)(valor);
  /**
   * Retorna o nome do cliente por identificador.
   * @param {string} id Identificador do cliente.
   * @param {Array<any>} clientes Lista de clientes.
   * @returns {string} Nome do cliente ou texto de fallback.
   */
  const nomeCliente = (id, clientes = loja.obter ? loja.obter("customers") : loja.get("customers")) => clientes.find((cliente) => cliente.id === id)?.name || "Cliente removido";
  /**
   * Cria o badge visual do status.
   * @param {string} status Status do pedido.
   * @returns {string} HTML do badge.
   */
  const emblemaStatus = (status) => `<span class="status-badge ${classesStatus[status] || ""}">${escaparHtml(status)}</span>`;
  /**
   * Retorna a linha de tabela vazia quando não há registros.
   * @param {string} linhas HTML das linhas já montadas.
   * @param {string} mensagem Texto da mensagem vazia.
   * @param {number} colunas Quantidade de colunas.
   * @param {string} acao HTML de ação extra.
   * @returns {string} HTML final para tabela vazia.
   */
  const linhasVazias = (linhas, mensagem, colunas, acao = "") => linhas || `<tr><td class="empty-table-cell" colspan="${colunas}">${escaparHtml(mensagem)}${acao}</td></tr>`;
  /**
   * Cria a área de botões de ação para cada linha.
   * @param {string} entidade Entidade da linha.
   * @param {string} id Identificador do item.
   * @param {string} nome Nome para acessibilidade.
   * @returns {string} HTML com os botões.
   */
  const botoesAcao = (entidade, id, nome) => { const singular = entidade === "customers" ? "customer" : entidade === "products" ? "product" : "order"; return `<div class="row-actions"><button class="row-action" data-action="edit-${singular}" data-id="${escaparHtml(id)}" aria-label="Editar ${escaparHtml(nome)}"><i class="bi bi-pencil"></i></button><button class="row-action" data-action="delete-${singular}" data-id="${escaparHtml(id)}" aria-label="Excluir ${escaparHtml(nome)}"><i class="bi bi-trash"></i></button></div>`; };
  /**
   * Exibe uma notificação de feedback para o usuário.
   * @param {string} mensagem Conteúdo da notificação.
   * @param {boolean} erro Indica se é erro.
   */
  const notificar = (mensagem, erro = false) => { const elemento = document.createElement("div"); elemento.className = `toast app-toast align-items-center border-0 ${erro ? "toast-error" : ""}`; elemento.setAttribute("role", erro ? "alert" : "status"); elemento.innerHTML = `<div class="d-flex"><div class="toast-body">${escaparHtml(mensagem)}</div><button class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>`; $("#toast-container").append(elemento); elemento.addEventListener("hidden.bs.toast", () => elemento.remove(), { once: true }); bootstrap.Toast.getOrCreateInstance(elemento, { delay: 3500 }).show(); };
  /**
   * Executa uma ação com tratamento centralizado de erros.
   * @param {Function} callback Função a ser executada.
   */
  const executarComTratamento = (callback) => { try { callback(); } catch (erro) { console.error(erro); notificar(erro.message || "Não foi possível concluir a operação.", true); } };
  /**
   * Converte uma data para o formato brasileiro.
   * @param {string|Date} valor Data a ser formatada.
   * @returns {string} Data formatada.
   */
  const formatarData = (valor) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(valor)).replace(".", "");

  /**
   * Renderiza o dashboard com indicadores e lista recente.
   */
  function renderizarDashboard() {
    const pedidos = loja.obter ? loja.obter("orders") : loja.get("orders");
    const estatisticas = (window.OrderFlowDashboard?.resumir || window.OrderFlowDashboard?.summarize)(pedidos);
    const contadorPendentes = $("#pending-count");
    if (contadorPendentes) contadorPendentes.textContent = estatisticas.countByStatus.Pendente + estatisticas.countByStatus["Em processamento"] + estatisticas.countByStatus.Enviado;
    if (!$("#kpi-revenue")) return;
    $("#kpi-revenue").textContent = moeda(estatisticas.revenue);
    $("#kpi-average").textContent = moeda(estatisticas.average);
    $("#kpi-completed").textContent = estatisticas.completedCount;
    $("#kpi-top-product").textContent = estatisticas.topProduct?.[0] || "—";
    $("#kpi-top-product-detail").textContent = estatisticas.topProduct ? `${estatisticas.topProduct[1]} unidade(s) vendida(s)` : "Ainda não há vendas";
    $("#status-progress").innerHTML = statusLista.map(([status, , cor]) => `<div class="progress-bar ${cor}" style="width:${estatisticas.totalOrders ? estatisticas.countByStatus[status] / estatisticas.totalOrders * 100 : 0}%"></div>`).join("");
    $("#status-list").innerHTML = statusLista.map(([status, rotulo]) => `<li class="list-group-item d-flex justify-content-between px-0"><span>${rotulo}</span><span class="text-secondary">${estatisticas.countByStatus[status]} · ${estatisticas.totalOrders ? Math.round(estatisticas.countByStatus[status] / estatisticas.totalOrders * 100) : 0}%</span></li>`).join("");
    const recentes = [...pedidos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    $("#recent-orders").innerHTML = linhasVazias(recentes.map((pedido) => `<tr><td>#${escaparHtml(pedido.number)}</td><td>${escaparHtml(nomeCliente(pedido.customerId))}</td><td>${moeda(pedido.total)}</td><td>${emblemaStatus(pedido.status)}</td></tr>`).join(""), "Nenhum pedido cadastrado.", 4, '<a class="btn btn-link btn-sm" href="novo-pedido.html">Criar pedido</a>');
    $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  }
  /**
   * Renderiza a tabela de clientes com filtro e histórico.
   */
  function renderizarClientes() {
    if (!$("#customer-search")) return;
    const consulta = $("#customer-search").value.trim().toLocaleLowerCase("pt-BR");
    const pedidos = loja.obter ? loja.obter("orders") : loja.get("orders");
    const clientes = (loja.obter ? loja.obter("customers") : loja.get("customers")).filter((cliente) => `${cliente.name} ${cliente.email}`.toLocaleLowerCase("pt-BR").includes(consulta)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    $("#customers-count").textContent = `${clientes.length} cliente(s)`;
    const linhas = clientes.map((cliente) => { const historico = pedidos.filter((pedido) => pedido.customerId === cliente.id && pedido.status !== "Cancelado"); const faturamentoEntregue = historico.filter((pedido) => pedido.status === "Entregue").reduce((soma, pedido) => soma + pedido.total, 0); return `<tr><td>${escaparHtml(cliente.name)}</td><td>${escaparHtml(cliente.email)}</td><td>${escaparHtml(cliente.phone || "—")}</td><td>${historico.length}</td><td>${moeda(faturamentoEntregue)}</td><td>${botoesAcao("customers", cliente.id, cliente.name)}</td></tr>`; }).join("");
    $("#customers-list").innerHTML = linhasVazias(linhas, "Nenhum cliente encontrado.", 6);
  }
  /**
   * Renderiza a tabela de produtos com busca, categoria e estoque.
   */
  function renderizarProdutos() {
    if (!$("#product-search")) return;
    const consulta = $("#product-search").value.trim().toLocaleLowerCase("pt-BR");
    const categoria = $("#category-filter").value;
    const filtroEstoque = $("#stock-filter").value;
    const produtos = (loja.obter ? loja.obter("products") : loja.get("products")).filter((produto) => `${produto.name} ${produto.category} ${produto.sku}`.toLocaleLowerCase("pt-BR").includes(consulta) && (!categoria || produto.category === categoria) && (!filtroEstoque || (filtroEstoque === "available" ? produto.stock > 8 : filtroEstoque === "low" ? produto.stock > 0 && produto.stock <= 8 : produto.stock === 0))).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    $("#products-count").textContent = `${produtos.length} produto(s)`;
    const linhas = produtos.map((produto) => { const [rotulo, estilo] = produto.stock === 0 ? ["Sem estoque", "status-cancelled"] : produto.stock <= 8 ? ["Estoque baixo", "status-pending"] : ["Disponível", "status-delivered"]; return `<tr><td>${escaparHtml(produto.name)}</td><td>${escaparHtml(produto.category)}</td><td>${escaparHtml(produto.sku || "—")}</td><td>${produto.stock}</td><td>${moeda(produto.price)}</td><td><span class="status-badge ${estilo}">${rotulo}</span></td><td>${botoesAcao("products", produto.id, produto.name)}</td></tr>`; }).join("");
    $("#products-list").innerHTML = linhasVazias(linhas, "Nenhum produto encontrado.", 7);
  }
  /**
   * Renderiza a lista de pedidos com filtros e status ajustável.
   */
  function renderizarPedidos() {
    if (!$("#order-search")) return;
    const consulta = $("#order-search").value.trim().toLocaleLowerCase("pt-BR");
    const statusSelecionado = $("#order-status-filter").value;
    const ordem = $("#order-sort").value;
    const clientes = loja.obter ? loja.obter("customers") : loja.get("customers");
    const pedidos = (loja.obter ? loja.obter("orders") : loja.get("orders")).filter((pedido) => `${pedido.number} ${nomeCliente(pedido.customerId, clientes)}`.toLocaleLowerCase("pt-BR").includes(consulta) && (!statusSelecionado || pedido.status === statusSelecionado));
    const ordenarPorData = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    pedidos.sort(ordem === "oldest" ? ordenarPorData : ordem === "highest" ? (a, b) => b.total - a.total : ordem === "lowest" ? (a, b) => a.total - b.total : (a, b) => ordenarPorData(b, a));
    const linhas = pedidos.map((pedido) => { const quantidadeItens = pedido.items.reduce((soma, item) => soma + item.quantity, 0); const opcoes = proximosStatus[pedido.status] || []; return `<tr><td>#${escaparHtml(pedido.number)}</td><td>${escaparHtml(nomeCliente(pedido.customerId, clientes))}</td><td>${formatarData(pedido.createdAt)}</td><td>${quantidadeItens}</td><td>${moeda(pedido.total)}</td><td><select class="form-select form-select-sm status-select ${classesStatus[pedido.status]}" data-action="status" data-id="${escaparHtml(pedido.id)}" aria-label="Status do pedido ${escaparHtml(pedido.number)}"><option selected>${escaparHtml(pedido.status)}</option>${opcoes.map((opcao) => `<option>${escaparHtml(opcao)}</option>`).join("")}</select></td><td><div class="row-actions"><button class="row-action" data-action="details" data-id="${escaparHtml(pedido.id)}" aria-label="Ver pedido ${escaparHtml(pedido.number)}"><i class="bi bi-eye"></i></button><button class="row-action" data-action="delete-order" data-id="${escaparHtml(pedido.id)}" aria-label="Excluir pedido ${escaparHtml(pedido.number)}"><i class="bi bi-trash"></i></button></div></td></tr>`; }).join("");
    $("#orders-list").innerHTML = linhasVazias(linhas, "Nenhum pedido encontrado.", 7);
    $("#orders-count").textContent = `${pedidos.length} pedido(s)`;
  }
  /**
   * Atualiza as opções dos selects de cliente e produto no formulário de pedido.
   */
  function renderizarOpcoesPedido() {
    if (!$("#order-customer") || !$("#order-product")) return;
    const clientes = loja.obter ? loja.obter("customers") : loja.get("customers");
    const produtos = (loja.obter ? loja.obter("products") : loja.get("products")).filter((produto) => produto.stock > 0);
    const selecionados = ["#order-customer", "#order-product"].map((seletor) => $(seletor).value);
    $("#order-customer").innerHTML = `<option value="" disabled ${selecionados[0] ? "" : "selected"}>Selecione um cliente</option>${clientes.map((cliente) => `<option value="${escaparHtml(cliente.id)}">${escaparHtml(cliente.name)} — ${escaparHtml(cliente.email)}</option>`).join("")}`;
    $("#order-product").innerHTML = `<option value="" disabled ${selecionados[1] ? "" : "selected"}>Selecione um produto</option>${produtos.map((produto) => `<option value="${escaparHtml(produto.id)}">${escaparHtml(produto.name)} — ${moeda(produto.price)} (${produto.stock} un.)</option>`).join("")}`;
    if (clientes.some((cliente) => cliente.id === selecionados[0])) $("#order-customer").value = selecionados[0];
    if (produtos.some((produto) => produto.id === selecionados[1])) $("#order-product").value = selecionados[1];
  }
  /**
   * Atualiza a UI do carrinho e recalcula valores do pedido.
   */
  function renderizarCarrinho() {
    if (!$("#order-form")) return;
    const totais = calculadora.calcular ? calculadora.calcular(carrinho, $("#shipping-region").value, cupom) : calculadora.calculate(carrinho, $("#shipping-region").value, cupom);
    $("#order-items").innerHTML = carrinho.length ? carrinho.map((item, indice) => `<div class="cart-item"><div class="cart-item-info"><strong>${escaparHtml(item.name)}</strong><small>${moeda(item.price)}</small></div><div class="cart-item-controls"><button class="quantity-button" data-action="quantity-down" data-index="${indice}" type="button" aria-label="Diminuir">−</button><span>${item.quantity}</span><button class="quantity-button" data-action="quantity-up" data-index="${indice}" type="button" aria-label="Aumentar">+</button><button class="row-action remove-item" data-action="remove-item" data-index="${indice}" type="button" aria-label="Remover"><i class="bi bi-trash"></i></button></div></div>`).join("") : '<p class="text-secondary small py-3 mb-0">Nenhum produto adicionado.</p>';
    $("#items-subtotal").textContent = moeda(totais.subtotal);
    $("#summary-subtotal").textContent = moeda(totais.subtotal);
    $("#summary-shipping").textContent = moeda(totais.shipping);
    $("#summary-discount").textContent = `− ${moeda(totais.discount)}`;
    $("#summary-total").textContent = moeda(totais.total);
    $("#coupon-feedback").textContent = totais.couponMessage;
    $("#coupon-feedback").className = `small ${totais.couponMessage.startsWith("Cupom aplicado") ? "coupon-success" : totais.couponMessage ? "coupon-error" : ""}`;
  }
  /**
   * Atualiza todas as áreas principais da aplicação.
   */
  function atualizarTela() { renderizarDashboard(); renderizarClientes(); renderizarProdutos(); renderizarPedidos(); renderizarOpcoesPedido(); }
  /**
   * Reinicia um formulário para um novo cadastro.
   * @param {string} entidade Tipo do formulário.
   */
  function reiniciarFormulario(entidade) { const formulario = $(`#${entidade}-form`); formulario.reset(); delete formulario.dataset.editId; $(`#${entidade}-modal-title`).textContent = `Novo ${entidade === "customer" ? "cliente" : "produto"}`; }
  /**
   * Preenche um formulário com os dados do registro selecionado.
   * @param {string} entidade Tipo do registro.
   * @param {string} id Identificador do registro.
   */
  function editarRegistro(entidade, id) { const registros = (loja.obter ? loja.obter(entidade === "customer" ? "customers" : "products") : loja.get(entidade === "customer" ? "customers" : "products")); const registro = registros.find((item) => item.id === id); if (!registro) throw new Error("Registro não encontrado."); const formulario = $(`#${entidade}-form`); formulario.dataset.editId = id; campos[entidade].forEach((campo) => { $(`#${entidade}-${campo}`).value = registro[campo] ?? ""; }); $(`#${entidade}-modal-title`).textContent = `Editar ${entidade === "customer" ? "cliente" : "produto"}`; bootstrap.Modal.getOrCreateInstance($(`#${entidade}-modal`)).show(); }
  /**
   * Solicita confirmação de exclusão e valida regras de negócio antes de remover.
   * @param {string} entidade Tipo da entidade.
   * @param {string} id Identificador do registro.
   */
  function perguntarExclusao(entidade, id) { const nomes = { customers: "cliente", products: "produto", orders: "pedido" }; if (!(loja.obter ? loja.obter(entidade) : loja.get(entidade)).some((item) => item.id === id)) throw new Error("Registro não encontrado."); if (entidade === "customers" && (loja.obter ? loja.obter("orders") : loja.get("orders")).some((pedido) => pedido.customerId === id)) throw new Error("Não é possível excluir um cliente que tem pedidos no histórico."); if (entidade === "products" && (loja.obter ? loja.obter("orders") : loja.get("orders")).some((pedido) => pedido.items.some((item) => item.productId === id))) throw new Error("Não é possível excluir um produto que aparece em pedidos."); alvoExclusao = { entidade, id }; $("#delete-modal-message").textContent = `Deseja excluir este ${nomes[entidade]}?`; bootstrap.Modal.getOrCreateInstance($("#delete-modal")).show(); }
  /**
   * Executa a ação clicada pela interface.
   * @param {{action:string, id?:string, index?:string}} dados Dados da ação.
   */
  function executarAcao({ action, id, index }) {
    if (action === "edit-customer") return editarRegistro("customer", id);
    if (action === "edit-product") return editarRegistro("product", id);
    if (action === "delete-customer") return perguntarExclusao("customers", id);
    if (action === "delete-product") return perguntarExclusao("products", id);
    if (action === "delete-order") return perguntarExclusao("orders", id);
    if (action === "add-customer" || action === "add-product") { const entidade = action === "add-customer" ? "customer" : "product"; reiniciarFormulario(entidade); return bootstrap.Modal.getOrCreateInstance($(`#${entidade}-modal`)).show(); }
    if (action === "details") { const pedido = (loja.obter ? loja.obter("orders") : loja.get("orders")).find((item) => item.id === id); if (pedido) window.alert(`${pedido.number}\n${pedido.items.map((item) => `${item.quantity} × ${item.name}`).join("\n")}\n\nTotal: ${moeda(pedido.total)}\nPagamento: ${pedido.payment}`); return; }
    if (["remove-item","quantity-up","quantity-down"].includes(action)) { const item = carrinho[Number(index)]; if (!item) return; if (action === "remove-item") carrinho.splice(Number(index), 1); else if (action === "quantity-up") { const produto = (loja.obter ? loja.obter("products") : loja.get("products")).find((entry) => entry.id === item.productId); if (!produto || item.quantity >= produto.stock) throw new Error("A quantidade excede o estoque disponível."); item.quantity += 1; } else if (item.quantity > 1) item.quantity -= 1; renderizarCarrinho(); }
  }

  document.addEventListener("click", (event) => { const botao = event.target.closest("button"); if (!botao) return; executarComTratamento(() => executarAcao(botao.dataset)); });
  document.addEventListener("change", (event) => { const elemento = event.target; if (["category-filter","stock-filter"].includes(elemento.id)) renderizarProdutos(); if (["order-status-filter","order-sort"].includes(elemento.id)) renderizarPedidos(); if (elemento.id === "shipping-region") renderizarCarrinho(); if (elemento.dataset.action === "status") executarComTratamento(() => { const metodo = loja.alterarStatusPedido || loja.changeOrderStatus; metodo(elemento.dataset.id, elemento.value); atualizarTela(); notificar("Status do pedido atualizado."); }); });
  ["customer-search","product-search","order-search"].forEach((id) => aoEscutar(`#${id}`, "input", id === "customer-search" ? renderizarClientes : id === "product-search" ? renderizarProdutos : renderizarPedidos));
  /**
   * Salva um cliente ou produto com validação prévia.
   * @param {string} entidade Entidade a ser salva.
   * @param {Event} evento Evento do submit.
   */
  function salvarRegistro(entidade, evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    executarComTratamento(() => {
      const dados = Object.fromEntries(campos[entidade].map((campo) => [campo, $(`#${entidade}-${campo}`).value]));
      const registro = entidade === "customer" ? (regras.validarCliente || regras.validateCustomer)(dados, loja.obter ? loja.obter("customers") : loja.get("customers"), formulario.dataset.editId || null) : (regras.validarProduto || regras.validateProduct)(dados);
      if (formulario.dataset.editId) (loja.atualizar || loja.update)(entidade === "customer" ? "customers" : "products", formulario.dataset.editId, registro);
      else {
        const criadoEm = new Date().toISOString();
        if (entidade === "customer") (loja.inserir || loja.insert)("customers", { ...registro, createdAt: criadoEm });
        else {
          const prefixo = { Acessórios: "ACC", Casa: "CAS", Vestuário: "VES" }[registro.category];
          const skus = (loja.obter ? loja.obter("products") : loja.get("products")).map((produto) => produto.sku);
          let sequencia = skus.length + 1;
          while (skus.includes(`${prefixo}-${String(sequencia).padStart(3, "0")}`)) sequencia += 1;
          (loja.inserir || loja.insert)("products", { ...registro, sku: `${prefixo}-${String(sequencia).padStart(3, "0")}`, createdAt: criadoEm });
        }
      }
      bootstrap.Modal.getOrCreateInstance($(`#${entidade}-modal`)).hide();
      reiniciarFormulario(entidade);
      atualizarTela();
      notificar(`${entidade === "customer" ? "Cliente" : "Produto"} salvo com sucesso.`);
    });
  }
  aoEscutar("#customer-form", "submit", (evento) => salvarRegistro("customer", evento));
  aoEscutar("#product-form", "submit", (evento) => salvarRegistro("product", evento));
  aoEscutar("#confirm-delete", "click", () => { if (!alvoExclusao) return; executarComTratamento(() => { if (alvoExclusao.entidade === "orders") (loja.excluirPedido || loja.deleteOrder)(alvoExclusao.id); else (loja.remover || loja.remove)(alvoExclusao.entidade, alvoExclusao.id); bootstrap.Modal.getOrCreateInstance($("#delete-modal")).hide(); alvoExclusao = null; atualizarTela(); notificar("Registro excluído."); }); });
  aoEscutar("#add-product-button", "click", () => executarComTratamento(() => { const produto = (loja.obter ? loja.obter("products") : loja.get("products")).find((item) => item.id === $("#order-product").value); const quantidade = Number($("#order-quantity").value); if (!produto) throw new Error("Selecione um produto."); if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error("Informe uma quantidade válida."); const noCarrinho = carrinho.find((item) => item.productId === produto.id); if (quantidade + (noCarrinho?.quantity || 0) > produto.stock) throw new Error("A quantidade excede o estoque disponível."); if (noCarrinho) noCarrinho.quantity += quantidade; else carrinho.push({ productId: produto.id, name: produto.name, price: produto.price, quantity: quantidade }); $("#order-quantity").value = "1"; renderizarCarrinho(); }));
  aoEscutar("#apply-coupon", "click", () => { const codigoSolicitado = $("#coupon-code").value.trim().toUpperCase(); const totais = calculadora.calcular ? calculadora.calcular(carrinho, $("#shipping-region").value, codigoSolicitado) : calculadora.calculate(carrinho, $("#shipping-region").value, codigoSolicitado); if (totais.couponMessage && !totais.couponMessage.startsWith("Cupom aplicado")) { cupom = ""; renderizarCarrinho(); $("#coupon-feedback").textContent = totais.couponMessage; $("#coupon-feedback").className = "small coupon-error"; return; } cupom = codigoSolicitado; renderizarCarrinho(); });
  aoEscutar("#coupon-code", "input", () => { cupom = ""; $("#coupon-feedback").textContent = ""; renderizarCarrinho(); });
  aoEscutar("#order-form", "submit", (evento) => { evento.preventDefault(); executarComTratamento(() => { const pedido = { customerId: $("#order-customer").value, items: carrinho, region: $("#shipping-region").value, payment: $("#payment-method").value }; (regras.validarPedido || regras.validateOrder)(pedido, loja.obter ? loja.obter("customers") : loja.get("customers"), loja.obter ? loja.obter("products") : loja.get("products")); const totais = calculadora.calcular ? calculadora.calcular(carrinho, pedido.region, cupom) : calculadora.calculate(carrinho, pedido.region, cupom); if (cupom && totais.coupon !== cupom) throw new Error("O cupom informado não pode ser aplicado."); const agora = new Date().toISOString(); (loja.criarPedido || loja.createOrder)({ ...pedido, number: (loja.proximoNumeroPedido || loja.nextOrderNumber)(), subtotal: totais.subtotal, shipping: totais.shipping, discount: totais.discount, total: totais.total, coupon: totais.coupon, notes: $("#order-notes").value.trim(), status: "Pendente", createdAt: agora, updatedAt: agora }); evento.currentTarget.reset(); carrinho = []; cupom = ""; $("#coupon-code").value = ""; atualizarTela(); renderizarCarrinho(); notificar("Pedido criado e estoque atualizado."); }); });
  aoEscutar("#customer-modal", "hidden.bs.modal", () => reiniciarFormulario("customer"));
  aoEscutar("#product-modal", "hidden.bs.modal", () => reiniciarFormulario("product"));
  aoEscutar("#delete-modal", "hidden.bs.modal", () => { alvoExclusao = null; });
  document.querySelectorAll('[data-bs-target="#customer-modal"]').forEach((botao) => botao.addEventListener("click", () => reiniciarFormulario("customer")));
  document.querySelectorAll('[data-bs-target="#product-modal"]').forEach((botao) => botao.addEventListener("click", () => reiniciarFormulario("product")));

  try { (loja.inicializarDados || loja.seed)(); atualizarTela(); renderizarCarrinho(); } catch (erro) { console.error(erro); notificar(erro.message || "Não foi possível iniciar o aplicativo.", true); }
})();
