// Lógica de Abas
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove a classe 'active' de todos os botões e conteúdos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Adiciona a classe 'active' ao botão clicado
        button.classList.add('active');

        // Exibe o conteúdo correspondente
        const tabTarget = document.querySelector(button.dataset.tabTarget);
        tabTarget.classList.add('active');

        // Adicional: Recarrega o conteúdo da aba se necessário
        const tabId = button.dataset.tabTarget;
        if (tabId === '#estoque') {
            carregarEstoque();
            carregarAlertasEstoque();
        } else if (tabId === '#relatorios') {
            carregarHistoricoVendasDiarias();
        }
    });
});

// Ações iniciais ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Carrega o conteúdo inicial da primeira aba
    carregarEstoque();
    carregarAlertasEstoque();
    carregarHistoricoVendasDiarias();
    DOM.valorRecebidoInput.style.display = 'block'; // Mostra por padrão ao carregar
});