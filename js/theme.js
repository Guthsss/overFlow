(() => {
  const storageKey = "orderflow-theme";
  const theme = (() => {
    try {
      return localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
    } catch (error) {
      console.error("Não foi possível carregar a preferência de tema.", error);
      return "light";
    }
  })();

  const atualizarBotao = (botao, temaAtual) => {
    const temaSeguinte = temaAtual === "dark" ? "claro" : "escuro";
    botao.setAttribute("aria-label", `Ativar tema ${temaSeguinte}`);
    botao.title = `Ativar tema ${temaSeguinte}`;
    botao.innerHTML = `<i class="bi ${temaAtual === "dark" ? "bi-sun" : "bi-moon-stars"}" aria-hidden="true"></i>`;
  };

  document.documentElement.setAttribute("data-bs-theme", theme);
  document.addEventListener("DOMContentLoaded", () => {
    const botao = document.querySelector("[data-theme-toggle]");
    if (!botao) return;

    atualizarBotao(botao, theme);
    botao.addEventListener("click", () => {
      const novoTema = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-bs-theme", novoTema);
      atualizarBotao(botao, novoTema);
      try {
        localStorage.setItem(storageKey, novoTema);
      } catch (error) {
        console.error("Não foi possível salvar a preferência de tema.", error);
      }
    });
  });
})();
