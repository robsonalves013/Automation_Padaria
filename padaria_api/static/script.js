// script.js (versão melhorada e unificada)
const API_URL = 'http://127.0.0.1:5000/api';

// Cache dos elementos do DOM
const DOM = {
    // Vendas
    produtoIdInput: document.getElementById('produto-id'),
    produtoQuantidadeInput: document.getElementById('produto-quantidade'),
    adicionarProdutoBtn: document.getElementById('adicionar-produto'),
    listaCarrinho: document.getElementById('lista-carrinho'),
    valorTotalSpan: document.getElementById('valor-total'),
    formaPagamentoSelect: document.getElementById('forma-pagamento'),
    valorRecebidoInput: document.getElementById('valor-recebido'),
    finalizarVendaBtn: document.getElementById('finalizar-venda'),
    trocoInfo: document.getElementById('troco-info'),

    // Estoque
    tabelaEstoqueBody: document.querySelector('#tabela-estoque tbody'),
    alertaInfoDiv: document.getElementById('alerta-info'),

    // Relatórios
    relatorioDiarioBtn: document.getElementById('relatorio-diario-btn'),
    relatorioMensalBtn: document.getElementById('relatorio-mensal-btn'),
    relatorioGeralBtn: document.getElementById('relatorio-geral-btn'),
    relatorioDeliveryBtn: document.getElementById('relatorio-delivery-btn'),
    enviarEmailBtn: document.getElementById('enviar-email-btn'),
    emailDestinatarioInput: document.getElementById('email-destinatario'),
    listaVendasDiarias: document.getElementById('lista-vendas-diarias'),

    // Modal
    modalSenha: document.getElementById('modal-senha'),
    senhaMestreInput: document.getElementById('senha-mestre'),
    fecharModalBtn: document.getElementById('fechar-modal-btn'),
    confirmarCancelamentoBtn: document.getElementById('confirmar-cancelamento-btn'),

    // Toast
    toastMessage: document.getElementById('toast-message'),
};

let carrinho = [];

// Funções Auxiliares
function formatarValor(valor) {
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
}

function mostrarToast(mensagem, tipo = 'success') {
    DOM.toastMessage.textContent = mensagem;
    DOM.toastMessage.className = `toast-message toast-${tipo}`;
    DOM.toastMessage.style.display = 'block';
    setTimeout(() => {
        DOM.toastMessage.style.display = 'none';
    }, 3000);
}

function abrirModalSenha(vendaId) {
    DOM.modalSenha.style.display = 'flex';
    DOM.modalSenha.dataset.vendaId = vendaId;
}

function fecharModalSenha() {
    DOM.modalSenha.style.display = 'none';
    DOM.senhaMestreInput.value = '';
    delete DOM.modalSenha.dataset.vendaId;
}

// Lógica de Vendas
async function carregarCarrinho() {
    DOM.listaCarrinho.innerHTML = '';
    let valorTotal = 0;
    carrinho.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.quantidade}x ${item.nome} (${formatarValor(item.valor)})</span>
            <span>${formatarValor(item.quantidade * item.valor)}</span>
            <button class="btn-remover-item" data-id="${item.id}">X</button>
        `;
        DOM.listaCarrinho.appendChild(li);
        valorTotal += item.quantidade * item.valor;
    });
    DOM.valorTotalSpan.textContent = valorTotal.toFixed(2);
    calcularTroco();
}

async function adicionarAoCarrinho() {
    const produtoId = DOM.produtoIdInput.value.trim();
    const quantidade = parseInt(DOM.produtoQuantidadeInput.value);

    if (!produtoId || isNaN(quantidade) || quantidade <= 0) {
        mostrarToast('Preencha os campos ID e Quantidade corretamente.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/estoque`);
        const data = await response.json();
        const produto = data.estoque.find(p => p.id === produtoId);
        
        if (!produto) {
            mostrarToast('Produto não encontrado.', 'error');
            return;
        }

        if (produto.quantidade < quantidade) {
            mostrarToast('Estoque insuficiente.', 'error');
            return;
        }

        const itemExistente = carrinho.find(item => item.id === produto.id);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ ...produto, quantidade });
        }

        DOM.produtoIdInput.value = '';
        DOM.produtoQuantidadeInput.value = '1';
        carregarCarrinho();
        mostrarToast('Produto adicionado ao carrinho!');
    } catch (error) {
        mostrarToast('Erro ao adicionar produto. Tente novamente.', 'error');
        console.error('Erro:', error);
    }
}

function removerDoCarrinho(produtoId) {
    carrinho = carrinho.filter(item => item.id !== produtoId);
    carregarCarrinho();
    mostrarToast('Item removido do carrinho.');
}

function calcularTroco() {
    const formaPagamento = DOM.formaPagamentoSelect.value;
    if (formaPagamento === 'Dinheiro') {
        const valorTotal = parseFloat(DOM.valorTotalSpan.textContent);
        const valorRecebido = parseFloat(DOM.valorRecebidoInput.value) || 0;
        const troco = valorRecebido - valorTotal;
        DOM.trocoInfo.textContent = `Troco: ${formatarValor(troco)}`;
    } else {
        DOM.trocoInfo.textContent = '';
    }
}

async function finalizarVenda() {
    if (carrinho.length === 0) {
        mostrarToast('O carrinho está vazio.', 'error');
        return;
    }

    const formaPagamento = DOM.formaPagamentoSelect.value;
    const valorRecebido = parseFloat(DOM.valorRecebidoInput.value) || 0;

    const vendaData = {
        carrinho,
        forma_pagamento: formaPagamento,
        valor_recebido: valorRecebido
    };

    try {
        const response = await fetch(`${API_URL}/vendas/balcao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendaData)
        });
        const data = await response.json();

        if (response.ok) {
            mostrarToast(data.mensagem);
            carrinho = [];
            carregarCarrinho();
            carregarEstoque(); // Atualiza a tabela de estoque após a venda
            carregarAlertasEstoque();
            carregarHistoricoVendasDiarias(); // Atualiza histórico diário
        } else {
            mostrarToast(data.erro, 'error');
        }
    } catch (error) {
        mostrarToast('Erro ao finalizar a venda. Tente novamente.', 'error');
        console.error('Erro:', error);
    }
}

async function cancelarVenda(vendaId, senha) {
    try {
        const response = await fetch(`${API_URL}/vendas/cancelar/${vendaId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha_mestre: senha })
        });
        const data = await response.json();

        if (response.ok) {
            mostrarToast(data.mensagem);
            fecharModalSenha();
            carregarHistoricoVendasDiarias();
            carregarEstoque(); // Atualiza a tabela de estoque
        } else {
            mostrarToast(data.erro, 'error');
        }
    } catch (error) {
        mostrarToast('Erro ao cancelar a venda. Tente novamente.', 'error');
        console.error('Erro:', error);
    }
}

// Lógica de Estoque
async function carregarEstoque() {
    try {
        const response = await fetch(`${API_URL}/estoque`);
        const data = await response.json();
        DOM.tabelaEstoqueBody.innerHTML = '';
        if (data.estoque && data.estoque.length > 0) {
            data.estoque.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${produto.id}</td>
                    <td>${produto.nome}</td>
                    <td>${formatarValor(produto.valor)}</td>
                    <td class="${produto.quantidade <= 10 ? 'alerta-quantidade' : ''}">${produto.quantidade}</td>
                    <td>
                        <button class="btn-editar-estoque" data-id="${produto.id}">Editar</button>
                    </td>
                `;
                DOM.tabelaEstoqueBody.appendChild(tr);
            });
        } else {
            DOM.tabelaEstoqueBody.innerHTML = '<tr><td colspan="5">Nenhum produto em estoque.</td></tr>';
        }
    } catch (error) {
        mostrarToast('Erro ao carregar o estoque.', 'error');
        console.error('Erro:', error);
    }
}

async function carregarAlertasEstoque() {
    try {
        const response = await fetch(`${API_URL}/estoque/alerta`);
        const data = await response.json();
        DOM.alertaInfoDiv.innerHTML = '';
        if (data.produtos_alerta && data.produtos_alerta.length > 0) {
            const lista = document.createElement('ul');
            data.produtos_alerta.forEach(produto => {
                const li = document.createElement('li');
                li.textContent = `🚨 O produto "${produto.nome}" está com estoque baixo: ${produto.quantidade} unidades.`;
                lista.appendChild(li);
            });
            DOM.alertaInfoDiv.appendChild(lista);
        } else {
            DOM.alertaInfoDiv.innerHTML = '<p>Nenhum produto com estoque baixo. Estoque em dia!</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
    }
}

// Lógica de Relatórios
async function carregarHistoricoVendasDiarias() {
    try {
        const response = await fetch(`${API_URL}/relatorios/diario`);
        const data = await response.json();
        DOM.listaVendasDiarias.innerHTML = '';
        if (data.vendas && data.vendas.length > 0) {
            data.vendas.forEach(venda => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>ID Venda: ${venda.id}</strong> | Data/Hora: ${new Date(venda.data_hora).toLocaleString()} | Valor: ${formatarValor(venda.valor_total)} (${venda.forma_pagamento})
                    <button class="btn-cancelar-venda btn-danger" data-id="${venda.id}">Cancelar Venda</button>
                `;
                DOM.listaVendasDiarias.appendChild(li);
            });
        } else {
            DOM.listaVendasDiarias.innerHTML = '<li>Nenhuma venda registrada hoje.</li>';
        }
    } catch (error) {
        mostrarToast('Erro ao carregar histórico de vendas.', 'error');
        console.error('Erro:', error);
    }
}

async function gerarRelatorio(tipo) {
    try {
        const response = await fetch(`${API_URL}/relatorios/${tipo}`);
        const data = await response.json();
        const relatorioNome = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        
        if (response.ok) {
            // Cria um link para download ou exibe em modal
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_${tipo}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            mostrarToast(`Relatório de Vendas ${relatorioNome} gerado com sucesso.`);
        } else {
            mostrarToast(data.erro, 'error');
        }
    } catch (error) {
        mostrarToast('Erro ao gerar relatório. Tente novamente.', 'error');
        console.error('Erro:', error);
    }
}

async function enviarRelatorioPorEmail() {
    const email = DOM.emailDestinatarioInput.value.trim();
    if (!email) {
        mostrarToast('Por favor, insira um endereço de e-mail.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/relatorios/enviar-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_destinatario: email })
        });
        const data = await response.json();
        if (response.ok) {
            mostrarToast(data.mensagem);
        } else {
            mostrarToast(data.erro, 'error');
        }
    } catch (error) {
        mostrarToast('Erro ao enviar o e-mail. Verifique a configuração do servidor.', 'error');
        console.error('Erro:', error);
    }
}

// Event Listeners
DOM.adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
DOM.finalizarVendaBtn.addEventListener('click', finalizarVenda);
DOM.listaCarrinho.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remover-item')) {
        removerDoCarrinho(e.target.dataset.id);
    }
});
DOM.formaPagamentoSelect.addEventListener('change', () => {
    DOM.valorRecebidoInput.style.display = DOM.formaPagamentoSelect.value === 'Dinheiro' ? 'block' : 'none';
    calcularTroco();
});
DOM.valorRecebidoInput.addEventListener('input', calcularTroco);

DOM.relatorioDiarioBtn.addEventListener('click', () => gerarRelatorio('diario'));
DOM.relatorioMensalBtn.addEventListener('click', () => gerarRelatorio('mensal'));
DOM.relatorioGeralBtn.addEventListener('click', () => gerarRelatorio('geral'));
DOM.relatorioDeliveryBtn.addEventListener('click', () => gerarRelatorio('delivery'));
DOM.enviarEmailBtn.addEventListener('click', enviarRelatorioPorEmail);

DOM.fecharModalBtn.addEventListener('click', fecharModalSenha);
DOM.confirmarCancelamentoBtn.addEventListener('click', () => {
    const vendaId = DOM.modalSenha.dataset.vendaId;
    const senha = DOM.senhaMestreInput.value;
    if (vendaId && senha) {
        cancelarVenda(vendaId, senha);
    } else {
        mostrarToast('Preencha a senha.', 'error');
    }
});

DOM.listaVendasDiarias.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-cancelar-venda')) {
        abrirModalSenha(e.target.dataset.id);
    }
});

// Ativação de atalhos de teclado
DOM.produtoIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        DOM.produtoQuantidadeInput.focus();
    }
});

DOM.produtoQuantidadeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        DOM.adicionarProdutoBtn.click();
    }
});

// Carrega dados iniciais
document.addEventListener('DOMContentLoaded', () => {
    carregarEstoque();
    carregarAlertasEstoque();
    carregarHistoricoVendasDiarias();
    DOM.valorRecebidoInput.style.display = 'block'; // Mostra por padrão ao carregar
});