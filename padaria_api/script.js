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
    tabelaEstoqueDiv: document.getElementById('tabela-estoque'),
    alertaInfoDiv: document.getElementById('alerta-info'),
    estoqueForm: document.getElementById('estoque-form'),
    formIdInput: document.getElementById('form-id'),
    formNomeInput: document.getElementById('form-nome'),
    formValorInput: document.getElementById('form-valor'),
    formQuantidadeInput: document.getElementById('form-quantidade'),

    // Vendas Delivery
    plataformaDeliverySelect: document.getElementById('plataforma-delivery'),
    produtoIdDeliveryInput: document.getElementById('produto-id-delivery'),
    produtoQuantidadeDeliveryInput: document.getElementById('produto-quantidade-delivery'),
    lancarSaidaDeliveryBtn: document.getElementById('lancar-saida-delivery'),

    // Relatórios
    relatorioOutputDiv: document.getElementById('relatorio-output'),
    relatorioDiarioBtn: document.getElementById('relatorio-diario'),
    relatorioMensalBtn: document.getElementById('relatorio-mensal'),
    relatorioGeralBtn: document.getElementById('relatorio-geral'),
    relatorioDeliveryBtn: document.getElementById('relatorio-delivery'),
    emailFormDiv: document.getElementById('email-form'),
    emailInput: document.getElementById('email-input'),
    enviarEmailBtn: document.getElementById('enviar-email-btn'),

    // Histórico de Vendas
    historicoVendasDiariasUl: document.getElementById('historico-vendas-diarias'),
    valorFechamentoCaixaSpan: document.getElementById('valor-fechamento-caixa'),

    // Modal de Senha
    modalSenha: document.getElementById('modal-senha'),
    senhaInput: document.getElementById('senha-input'),
    confirmarCancelamentoBtn: document.getElementById('confirmar-cancelamento-btn'),
    fecharModalBtn: document.getElementById('fechar-modal-btn'),
    
    // Toast
    toastMessage: document.getElementById('toast-message'),
};

let carrinho = [];
let vendaParaCancelarId = null;
let tipoRelatorioAtual = null;

// Funções Utilitárias
function showToast(message, isSuccess = true) {
    DOM.toastMessage.textContent = message;
    DOM.toastMessage.style.backgroundColor = isSuccess ? 'var(--success-green)' : 'var(--danger-red)';
    DOM.toastMessage.style.display = 'block';
    setTimeout(() => {
        DOM.toastMessage.style.display = 'none';
    }, 3000);
}

async function fetchData(url, options = {}) {
    try {
        const response = await fetch(`${API_URL}${url}`, options);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.erro || 'Erro na requisição.');
        }
        return result;
    } catch (error) {
        showToast(`Erro: ${error.message}`, false);
        console.error('Erro:', error);
        throw error;
    }
}

// Funções de Vendas
async function adicionarAoCarrinho() {
    const produtoId = DOM.produtoIdInput.value.trim();
    const quantidade = parseInt(DOM.produtoQuantidadeInput.value);

    if (!produtoId || quantidade < 1) {
        showToast('Por favor, insira um código de produto e uma quantidade válida.', false);
        return;
    }

    try {
        const estoque = await fetchData('/estoque');
        const produto = estoque.estoque.find(p => p.id === produtoId);

        if (!produto) {
            showToast('Produto não encontrado no estoque.', false);
            return;
        }

        const itemExistente = carrinho.find(item => item.id === produto.id);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ ...produto, quantidade });
        }
        
        atualizarCarrinhoUI();
        DOM.produtoIdInput.value = '';
        DOM.produtoQuantidadeInput.value = 1;
        DOM.produtoIdInput.focus();
        showToast('Produto adicionado ao carrinho.');
    } catch (error) {
        // O erro já é tratado na função fetchData
    }
}

function removerItemCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    atualizarCarrinhoUI();
    showToast('Item removido do carrinho.');
}

function atualizarCarrinhoUI() {
    DOM.listaCarrinho.innerHTML = '';
    let total = 0;
    carrinho.forEach(item => {
        const li = document.createElement('li');
        const valorItem = item.quantidade * item.valor;
        li.innerHTML = `
            <span>${item.quantidade}x ${item.nome}</span>
            <span>R$ ${valorItem.toFixed(2)}</span>
            <button class="btn-remove-item" data-id="${item.id}">X</button>
        `;
        li.querySelector('.btn-remove-item').addEventListener('click', () => removerItemCarrinho(item.id));
        DOM.listaCarrinho.appendChild(li);
        total += valorItem;
    });
    DOM.valorTotalSpan.textContent = total.toFixed(2);
    calcularTroco();
}

function calcularTroco() {
    const totalVenda = parseFloat(DOM.valorTotalSpan.textContent);
    const formaPagamento = DOM.formaPagamentoSelect.value;
    const valorRecebido = parseFloat(DOM.valorRecebidoInput.value) || 0;

    if (formaPagamento === 'Dinheiro') {
        const troco = valorRecebido - totalVenda;
        if (troco >= 0) {
            DOM.trocoInfo.textContent = `Troco: R$ ${troco.toFixed(2)}`;
            DOM.trocoInfo.style.color = 'var(--success-green)';
        } else {
            DOM.trocoInfo.textContent = `Faltam R$ ${(-troco).toFixed(2)}`;
            DOM.trocoInfo.style.color = 'var(--danger-red)';
        }
        DOM.trocoInfo.style.display = 'block';
    } else {
        DOM.trocoInfo.style.display = 'none';
    }
}

async function finalizarVenda() {
    if (carrinho.length === 0) {
        showToast('O carrinho está vazio.', false);
        return;
    }

    const formaPagamento = DOM.formaPagamentoSelect.value;
    const valorRecebido = parseFloat(DOM.valorRecebidoInput.value) || 0;
    const totalVenda = parseFloat(DOM.valorTotalSpan.textContent);

    if (formaPagamento === 'Dinheiro' && valorRecebido < totalVenda) {
        showToast('O valor recebido é menor que o valor total da venda.', false);
        return;
    }

    const vendaData = {
        carrinho: carrinho.map(item => ({ id: item.id, quantidade: item.quantidade })),
        forma_pagamento: formaPagamento,
        valor_recebido: valorRecebido
    };

    try {
        await fetchData('/vendas/balcao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendaData)
        });
        
        showToast('Venda finalizada com sucesso!');
        carrinho = [];
        atualizarCarrinhoUI();
        DOM.trocoInfo.style.display = 'none';
        carregarHistoricoVendasDiarias();
        visualizarEstoque();
    } catch (error) {
        // O erro já é tratado na função fetchData
    }
}

// Funções de Estoque
async function visualizarEstoque() {
    try {
        const result = await fetchData('/estoque');
        const estoque = result.estoque;

        let tabelaHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Cód.</th>
                        <th>Nome</th>
                        <th>Valor (R$)</th>
                        <th>Quantidade</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        estoque.forEach(produto => {
            tabelaHTML += `
                <tr class="${produto.alerta_reposicao ? 'alerta' : ''}">
                    <td>${produto.id}</td>
                    <td>${produto.nome}</td>
                    <td>${produto.valor.toFixed(2)}</td>
                    <td>${produto.quantidade}</td>
                    <td><button class="btn btn-secondary btn-small" onclick="preencherFormulario('${produto.id}', '${produto.nome}', ${produto.valor}, ${produto.quantidade})">Editar</button></td>
                </tr>
            `;
        });
        tabelaHTML += `
                </tbody>
            </table>
        `;
        DOM.tabelaEstoqueDiv.innerHTML = tabelaHTML;
    } catch (error) {
        DOM.tabelaEstoqueDiv.innerHTML = `<p class="erro">Não foi possível carregar o estoque.</p>`;
    }
}

function preencherFormulario(id, nome, valor, quantidade) {
    DOM.formIdInput.value = id;
    DOM.formNomeInput.value = nome;
    DOM.formValorInput.value = valor;
    DOM.formQuantidadeInput.value = quantidade;
}

async function manipularEstoque(event) {
    event.preventDefault();

    const produtoData = {
        id: DOM.formIdInput.value.trim(),
        nome: DOM.formNomeInput.value.trim(),
        valor: parseFloat(DOM.formValorInput.value),
        quantidade: parseInt(DOM.formQuantidadeInput.value)
    };
    
    if (!produtoData.id || !produtoData.nome || isNaN(produtoData.valor) || isNaN(produtoData.quantidade)) {
        showToast('Por favor, preencha todos os campos corretamente.', false);
        return;
    }

    try {
        const result = await fetchData('/estoque/produto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoData)
        });

        showToast(`Produto ${result.mensagem.toLowerCase()}!`);
        DOM.estoqueForm.reset();
        visualizarEstoque();
        verAlertasEstoque();
    } catch (error) {
        // O erro já é tratado na função fetchData
    }
}

async function verAlertasEstoque() {
    try {
        const result = await fetchData('/estoque/alerta');

        if (result.produtos && result.produtos.length > 0) {
            const listaAlerta = result.produtos.map(p => `${p.nome} (Qtd: ${p.quantidade})`).join('<br>');
            DOM.alertaInfoDiv.innerHTML = `<h3>Produtos com Estoque Baixo:</h3><p>${listaAlerta}</p>`;
            DOM.alertaInfoDiv.style.display = 'block';
        } else {
            DOM.alertaInfoDiv.innerHTML = `<p>${result.mensagem}</p>`;
            DOM.alertaInfoDiv.style.display = 'none';
        }
    } catch (error) {
        DOM.alertaInfoDiv.innerHTML = `<p class="erro">Erro ao buscar alertas.</p>`;
    }
}

// Funções de Vendas Delivery
async function lancarSaidaDelivery() {
    const plataforma = DOM.plataformaDeliverySelect.value;
    const produtoId = DOM.produtoIdDeliveryInput.value.trim();
    const quantidade = parseInt(DOM.produtoQuantidadeDeliveryInput.value);

    if (!produtoId || quantidade < 1) {
        showToast('Por favor, insira um código de produto e uma quantidade válida.', false);
        return;
    }

    const vendaData = {
        plataforma: plataforma,
        produto_id: produtoId,
        quantidade: quantidade
    };

    try {
        await fetchData('/vendas/delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendaData)
        });
        showToast('Saída de delivery lançada com sucesso!');
        DOM.produtoIdDeliveryInput.value = '';
        DOM.produtoQuantidadeDeliveryInput.value = 1;
        visualizarEstoque();
        carregarHistoricoVendasDiarias();
    } catch (error) {
        // O erro já é tratado na função fetchData
    }
}

// Funções de Relatórios
async function carregarHistoricoVendasDiarias() {
    try {
        const result = await fetchData('/relatorios/diario');
        DOM.historicoVendasDiariasUl.innerHTML = '';
        let totalDiario = 0;

        if (result.vendas && result.vendas.length > 0) {
            result.vendas.forEach(venda => {
                const li = document.createElement('li');
                li.classList.toggle('cancelada', venda.status === 'cancelada');

                const valorTotal = venda.valor_total.toFixed(2);
                const dataHora = new Date(venda.data_hora);
                const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                let itensVendaHTML = `<ul class="detalhes-venda-lista">`;
                venda.itens_vendidos.forEach(item => {
                    itensVendaHTML += `<li>${item.quantidade}x ${item.nome}</li>`;
                });
                itensVendaHTML += `</ul>`;

                let observacaoCancelamentoHTML = '';
                if (venda.status === 'cancelada' && venda.observacao_cancelamento) {
                    observacaoCancelamentoHTML = `<p class="observacao-cancelamento"><span>Motivo:</span> ${venda.observacao_cancelamento}</p>`;
                }
                
                const toggleBtn = `<button class="btn btn-toggle-detalhes">Detalhes</button>`;
                const cancelarBtn = `<button class="btn btn-cancelar" onclick="abrirModalSenha(${venda.id})">Cancelar</button>`;

                li.innerHTML = `
                    <div class="venda-resumo">
                        <span class="venda-hora">${hora}</span>
                        <span class="venda-valor">R$ ${valorTotal}</span>
                        ${venda.status !== 'cancelada' ? toggleBtn + cancelarBtn : toggleBtn}
                    </div>
                    <div class="venda-detalhes" style="display:none;">
                        ${itensVendaHTML}
                        ${observacaoCancelamentoHTML}
                    </div>
                `;

                li.querySelector('.btn-toggle-detalhes')?.addEventListener('click', () => {
                    const detalhes = li.querySelector('.venda-detalhes');
                    detalhes.style.display = detalhes.style.display === 'block' ? 'none' : 'block';
                });

                DOM.historicoVendasDiariasUl.appendChild(li);

                if (venda.status !== 'cancelada') {
                    totalDiario += venda.valor_total;
                }
            });
        } else {
            DOM.historicoVendasDiariasUl.innerHTML = `<li class="message-info">Nenhuma venda registrada hoje.</li>`;
        }

        DOM.valorFechamentoCaixaSpan.textContent = totalDiario.toFixed(2);
        DOM.emailFormDiv.style.display = 'block';
        tipoRelatorioAtual = 'diario';
    } catch (error) {
        DOM.historicoVendasDiariasUl.innerHTML = `<li class="erro">Erro ao carregar o histórico.</li>`;
        DOM.valorFechamentoCaixaSpan.textContent = '0.00';
    }
}

async function gerarRelatorio(endpoint, titulo) {
    try {
        const result = await fetchData(`/relatorios/${endpoint}`);
        if (!result.vendas || result.vendas.length === 0) {
            DOM.relatorioOutputDiv.innerHTML = `<p class="message-info">${result.mensagem}</p>`;
            DOM.emailFormDiv.style.display = 'none';
            return;
        }

        let html = `
            <h3>${titulo}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Valor Total</th>
                        <th>Forma de Pagamento</th>
                        <th>Tipo</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        result.vendas.forEach(venda => {
            const dataHora = new Date(venda.data_hora);
            const dataFormatada = dataHora.toLocaleDateString('pt-BR');
            const horaFormatada = dataHora.toLocaleTimeString('pt-BR');
            html += `
                <tr class="${venda.status}">
                    <td>${dataFormatada} ${horaFormatada}</td>
                    <td>R$ ${venda.valor_total.toFixed(2)}</td>
                    <td>${venda.forma_pagamento}</td>
                    <td>${venda.tipo_venda}</td>
                    <td>${venda.status}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
        `;
        DOM.relatorioOutputDiv.innerHTML = html;
        DOM.emailFormDiv.style.display = 'block';
        tipoRelatorioAtual = endpoint;
    } catch (error) {
        DOM.relatorioOutputDiv.innerHTML = `<p class="erro">Erro ao gerar o relatório.</p>`;
        DOM.emailFormDiv.style.display = 'none';
    }
}

async function enviarRelatorioPorEmail() {
    const email = DOM.emailInput.value.trim();
    if (!email) {
        showToast('Por favor, digite um endereço de e-mail.', false);
        return;
    }
    
    if (!tipoRelatorioAtual) {
        showToast('Por favor, gere um relatório antes de enviá-lo por e-mail.', false);
        return;
    }

    try {
        await fetchData('/relatorios/enviar-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tipo_relatorio: tipoRelatorioAtual })
        });
        showToast('Relatório enviado com sucesso!');
        DOM.emailInput.value = '';
    } catch (error) {
        // O erro já é tratado na função fetchData
    }
}

// Funções do Modal de Senha
function abrirModalSenha(vendaId) {
    vendaParaCancelarId = vendaId;
    DOM.modalSenha.style.display = 'flex';
    DOM.senhaInput.focus();
}

function fecharModalSenha() {
    DOM.modalSenha.style.display = 'none';
    DOM.senhaInput.value = '';
    vendaParaCancelarId = null;
}

async function confirmarCancelamento() {
    const senha = DOM.senhaInput.value;
    if (!senha) {
        showToast('Por favor, digite a senha mestre.', false);
        return;
    }

    try {
        await fetchData(`/vendas/cancelar/${vendaParaCancelarId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha_mestre: senha })
        });
        
        showToast('Venda cancelada com sucesso!');
        fecharModalSenha();
        carregarHistoricoVendasDiarias();
        visualizarEstoque();
    } catch (error) {
        // O erro já é tratado na função fetchData
        DOM.senhaInput.value = '';
    }
}

// Event Listeners
DOM.adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
DOM.finalizarVendaBtn.addEventListener('click', finalizarVenda);
DOM.lancarSaidaDeliveryBtn.addEventListener('click', lancarSaidaDelivery);
DOM.estoqueForm.addEventListener('submit', manipularEstoque);
document.getElementById('visualizar-estoque').addEventListener('click', visualizarEstoque);
document.getElementById('alerta-estoque').addEventListener('click', verAlertasEstoque);
DOM.relatorioDiarioBtn.addEventListener('click', () => carregarHistoricoVendasDiarias());
DOM.relatorioMensalBtn.addEventListener('click', () => gerarRelatorio('mensal', 'Relatório de Vendas Mensais'));
DOM.relatorioGeralBtn.addEventListener('click', () => gerarRelatorio('geral', 'Relatório de Vendas Geral'));
DOM.relatorioDeliveryBtn.addEventListener('click', () => gerarRelatorio('delivery', 'Relatório de Vendas Delivery'));
DOM.enviarEmailBtn.addEventListener('click', enviarRelatorioPorEmail);
DOM.formaPagamentoSelect.addEventListener('change', () => {
    DOM.valorRecebidoInput.style.display = DOM.formaPagamentoSelect.value === 'Dinheiro' ? 'block' : 'none';
    calcularTroco();
});
DOM.valorRecebidoInput.addEventListener('input', calcularTroco);
DOM.fecharModalBtn.addEventListener('click', fecharModalSenha);
DOM.confirmarCancelamentoBtn.addEventListener('click', confirmarCancelamento);

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

// Carrega dados iniciais ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarHistoricoVendasDiarias();
    visualizarEstoque();
    verAlertasEstoque();
});