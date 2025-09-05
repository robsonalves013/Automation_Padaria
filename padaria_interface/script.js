// Onde sua API está rodando
const API_URL = 'http://127.0.0.1:5000';

// Cache dos elementos do DOM para melhor performance
const produtoIdInput = document.getElementById('produto-id');
const produtoQuantidadeInput = document.getElementById('produto-quantidade');
const adicionarProdutoBtn = document.getElementById('adicionar-produto');
const listaCarrinho = document.getElementById('lista-carrinho');
const valorTotalSpan = document.getElementById('valor-total');
const formaPagamentoSelect = document.getElementById('forma-pagamento');
const valorRecebidoInput = document.getElementById('valor-recebido');
const finalizarVendaBtn = document.getElementById('finalizar-venda');
const trocoInfo = document.getElementById('troco-info');
const tabelaEstoqueDiv = document.getElementById('tabela-estoque');
const alertaInfoDiv = document.getElementById('alerta-info');
const relatorioOutputDiv = document.getElementById('relatorio-output');

// NOVOS ELEMENTOS para o histórico de vendas
const historicoVendasDiariasUl = document.getElementById('historico-vendas-diarias');
const valorFechamentoCaixaSpan = document.getElementById('valor-fechamento-caixa');

// Elementos do formulário de estoque
const estoqueForm = document.getElementById('estoque-form');
const formIdInput = document.getElementById('form-id');
const formNomeInput = document.getElementById('form-nome');
const formValorInput = document.getElementById('form-valor');
const formQuantidadeInput = document.getElementById('form-quantidade');

// Novos elementos para Vendas Delivery
const plataformaDeliverySelect = document.getElementById('plataforma-delivery');
const produtoIdDeliveryInput = document.getElementById('produto-id-delivery');
const produtoQuantidadeDeliveryInput = document.getElementById('produto-quantidade-delivery');
const lancarSaidaDeliveryBtn = document.getElementById('lancar-saida-delivery');

// Novos elementos do Modal de Senha
const modalSenha = document.getElementById('modal-senha');
const senhaInput = document.getElementById('senha-input');
const confirmarCancelamentoBtn = document.getElementById('confirmar-cancelamento-btn');
const fecharModalBtn = document.getElementById('fechar-modal-btn');


let carrinho = [];

// Funções de Vendas
// ---

async function adicionarAoCarrinho() {
    const produtoId = produtoIdInput.value.trim();
    const quantidade = parseInt(produtoQuantidadeInput.value);

    if (!produtoId || quantidade < 1) {
        alert('Por favor, insira um código de produto e uma quantidade válida.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/estoque`);
        const result = await response.json();
        const produto = result.estoque.find(p => p.id === produtoId);

        if (!produto) {
            alert('Produto não encontrado no estoque.');
            return;
        }

        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            valor: produto.valor,
            quantidade: quantidade
        });
        
        atualizarCarrinhoUI();
        produtoIdInput.value = '';
        produtoQuantidadeInput.value = 1;
        produtoIdInput.focus();

    } catch (error) {
        alert('Erro ao buscar produto. Tente novamente.');
        console.error('Erro:', error);
    }
}

function atualizarCarrinhoUI() {
    listaCarrinho.innerHTML = '';
    let total = 0;
    carrinho.forEach(item => {
        const li = document.createElement('li');
        const valorItem = item.quantidade * item.valor;
        li.textContent = `${item.quantidade}x ${item.nome} - R$ ${valorItem.toFixed(2)}`;
        listaCarrinho.appendChild(li);
        total += valorItem;
    });
    valorTotalSpan.textContent = total.toFixed(2);
    calcularTroco();
}

function calcularTroco() {
    const totalVenda = parseFloat(valorTotalSpan.textContent);
    const formaPagamento = formaPagamentoSelect.value;
    const valorRecebido = parseFloat(valorRecebidoInput.value) || 0;

    if (formaPagamento === 'Dinheiro') {
        if (valorRecebido >= totalVenda) {
            const troco = valorRecebido - totalVenda;
            trocoInfo.textContent = `Troco: R$ ${troco.toFixed(2)}`;
            trocoInfo.style.display = 'block';
        } else {
            trocoInfo.textContent = `Faltam R$ ${(totalVenda - valorRecebido).toFixed(2)}`;
            trocoInfo.style.display = 'block';
        }
    } else {
        trocoInfo.style.display = 'none';
    }
}

async function finalizarVenda() {
    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    const formaPagamento = formaPagamentoSelect.value;
    const valorRecebido = parseFloat(valorRecebidoInput.value) || 0;
    const totalVenda = parseFloat(valorTotalSpan.textContent);

    if (formaPagamento === 'Dinheiro' && valorRecebido < totalVenda) {
        alert('O valor recebido é menor que o valor total da venda. A venda não pode ser finalizada.');
        return;
    }

    const vendaData = {
        carrinho: carrinho.map(item => ({ id: item.id, quantidade: item.quantidade })),
        forma_pagamento: formaPagamento,
        valor_recebido: valorRecebido
    };

    try {
        const response = await fetch(`${API_URL}/vendas/balcao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendaData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Venda finalizada com sucesso!');
            carrinho = [];
            atualizarCarrinhoUI();
            trocoInfo.style.display = 'none';
            // Chama a função para atualizar o histórico de vendas após o sucesso
            carregarHistoricoVendasDiarias();
        } else {
            alert(`Erro na venda: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

async function carregarHistoricoVendasDiarias() {
    try {
        const response = await fetch(`${API_URL}/relatorios/diario`);
        
        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        historicoVendasDiariasUl.innerHTML = '';
        let totalDiario = 0;

        if (result.vendas && result.vendas.length > 0) {
            result.vendas.forEach(venda => {
                const li = document.createElement('li');
                // Aplica a classe 'cancelada' se o status for 'cancelada'
                if (venda.status === 'cancelada') {
                    li.classList.add('cancelada');
                }
                
                const valorTotal = venda.valor_total.toFixed(2);
                const dataHora = new Date(venda.data_hora);
                const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // CRIA A LISTA DE ITENS OCULTA
                let itensVendaHTML = `<ul style="display: none;" class="detalhes-venda-lista">`;
                venda.itens_vendidos.forEach(item => {
                    itensVendaHTML += `<li>${item.quantidade}x ${item.nome}</li>`;
                });
                itensVendaHTML += `</ul>`;

                let observacaoCancelamentoHTML = '';
                if (venda.status === 'cancelada' && venda.observacao_cancelamento) {
                    observacaoCancelamentoHTML = `<span class="observacao-cancelamento">(${venda.observacao_cancelamento})</span>`;
                }

                const cancelarButtonDisabled = venda.status === 'cancelada' ? 'disabled' : '';

                li.innerHTML = `
                    <div class="venda-resumo">
                        <strong>[${hora}]</strong> Venda #${venda.id} - R$ ${valorTotal} ${observacaoCancelamentoHTML}
                        <div class="venda-acoes">
                            <button class="btn-detalhes">+ Detalhes</button>
                            <button class="btn-cancelar" data-venda-id="${venda.id}" ${cancelarButtonDisabled}>Cancelar Venda</button>
                        </div>
                    </div>
                    ${itensVendaHTML}
                `;
                historicoVendasDiariasUl.appendChild(li);
                
                // Somente soma ao total de vendas diárias se a venda não estiver cancelada
                if (venda.status !== 'cancelada') {
                    totalDiario += venda.valor_total;
                }
            });

            // Adiciona o evento de clique aos botões de detalhes
            document.querySelectorAll('.btn-detalhes').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const listaItens = event.target.closest('li').querySelector('.detalhes-venda-lista');
                    if (listaItens.style.display === 'none') {
                        listaItens.style.display = 'block';
                        event.target.textContent = '- Fechar';
                    } else {
                        listaItens.style.display = 'none';
                        event.target.textContent = '+ Detalhes';
                    }
                });
            });

            // Adiciona o evento de clique aos botões de cancelar
            document.querySelectorAll('.btn-cancelar').forEach(btn => {
                if (!btn.disabled) { // Apenas adiciona o listener se o botão não estiver desabilitado
                    btn.addEventListener('click', (event) => {
                        const vendaId = event.target.dataset.vendaId;
                        abrirModalSenha(vendaId);
                    });
                }
            });

        } else {
            historicoVendasDiariasUl.innerHTML = '<li>Nenhuma venda registrada hoje.</li>';
        }

        valorFechamentoCaixaSpan.textContent = totalDiario.toFixed(2);

    } catch (error) {
        console.error('Erro ao carregar histórico de vendas:', error);
        historicoVendasDiariasUl.innerHTML = '<li>Erro ao carregar o histórico.</li>';
        valorFechamentoCaixaSpan.textContent = '0.00';
    }
}

// Nova função para Lançamento de Vendas Delivery
async function lancarSaidaDelivery() {
    const plataforma = plataformaDeliverySelect.value;
    const produtoId = produtoIdDeliveryInput.value.trim();
    const quantidade = parseInt(produtoQuantidadeDeliveryInput.value);

    if (!produtoId || quantidade < 1) {
        alert('Por favor, insira um código de produto e uma quantidade válida.');
        return;
    }

    const saidaData = {
        plataforma: plataforma,
        id: produtoId,
        quantidade: quantidade
    };

    try {
        const response = await fetch(`${API_URL}/estoque/saida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saidaData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Saída de estoque lançada com sucesso: ${result.mensagem}`);
            produtoIdDeliveryInput.value = '';
            produtoQuantidadeDeliveryInput.value = 1;
            visualizarEstoque();
            // ADICIONADO: Chama a função para atualizar o histórico de vendas após o sucesso
            carregarHistoricoVendasDiarias();
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

// Funções para o Modal de Senha
function abrirModalSenha(vendaId) {
    modalSenha.style.display = 'flex';
    senhaInput.value = ''; // Limpa o campo
    senhaInput.focus();

    // Remove listeners antigos para evitar duplicação
    const oldConfirmBtn = confirmarCancelamentoBtn;
    const newConfirmBtn = oldConfirmBtn.cloneNode(true);
    oldConfirmBtn.parentNode.replaceChild(newConfirmBtn, oldConfirmBtn);
    
    // Adiciona o novo listener com o vendaId correto
    newConfirmBtn.addEventListener('click', async () => {
        const senhaMestre = senhaInput.value;
        if (!senhaMestre) {
            alert('Por favor, digite a senha mestre.');
            return;
        }

        const motivo = prompt('Por favor, digite o motivo do cancelamento:');
        if (!motivo) {
            alert('Cancelamento abortado. O motivo é obrigatório.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/vendas/cancelar/${vendaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senha: senhaMestre,
                    motivo: motivo
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Venda cancelada com sucesso!');
                carregarHistoricoVendasDiarias();
            } else {
                alert(`Erro ao cancelar a venda: ${result.erro}`);
            }
        } catch (error) {
            alert('Erro de comunicação com a API ao cancelar a venda.');
            console.error('Erro:', error);
        }

        fecharModalSenha();
    });
}


function fecharModalSenha() {
    modalSenha.style.display = 'none';
}

// NOVO: Adiciona a função para manipular o formulário de estoque
async function manipularEstoque(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const id = formIdInput.value.trim();
    const nome = formNomeInput.value.trim();
    const valor = parseFloat(formValorInput.value);
    const quantidade = parseInt(formQuantidadeInput.value);

    if (!id || !nome || isNaN(valor) || isNaN(quantidade)) {
        alert('Por favor, preencha todos os campos do formulário de estoque com valores válidos.');
        return;
    }

    const produtoData = {
        id: id,
        nome: nome,
        valor: valor,
        quantidade: quantidade
    };

    try {
        const response = await fetch(`${API_URL}/estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Produto ${result.mensagem}`);
            estoqueForm.reset(); // Limpa o formulário após o sucesso
            visualizarEstoque(); // Supondo que você tenha essa função para atualizar a tabela
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

// Event Listeners
adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
finalizarVendaBtn.addEventListener('click', finalizarVenda);
lancarSaidaDeliveryBtn.addEventListener('click', lancarSaidaDelivery);

// Otimiza o cálculo do troco para ser dinâmico
valorRecebidoInput.addEventListener('input', calcularTroco);
formaPagamentoSelect.addEventListener('change', calcularTroco);

// Modal de Senha
fecharModalBtn.addEventListener('click', fecharModalSenha);

// NOVO: Adiciona o evento de submit para o formulário de estoque
estoqueForm.addEventListener('submit', manipularEstoque);

// Carrega o histórico de vendas ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarHistoricoVendasDiarias();
    // A função visualizarEstoque() deve ser adicionada e chamada aqui se for o caso
});