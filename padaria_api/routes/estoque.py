from flask import Blueprint, jsonify, request
from models import db, ProdutoEstoque, Venda, VendaItem
from datetime import datetime
import pytz

estoque_bp = Blueprint('estoque_bp', __name__)

@estoque_bp.route('/estoque', methods=['GET'])
def get_estoque():
    """Retorna a lista completa de produtos em estoque."""
    produtos = ProdutoEstoque.query.all()
    lista_produtos = []
    for p in produtos:
        alerta = p.quantidade <= 10
        lista_produtos.append({
            'id': p.id,
            'nome': p.nome,
            'valor': p.valor,
            'quantidade': p.quantidade,
            'alerta_reposicao': alerta
        })
    return jsonify({'estoque': lista_produtos})

@estoque_bp.route('/estoque/produto', methods=['POST'])
def add_or_update_produto():
    """Adiciona um novo produto ou atualiza um existente."""
    data = request.get_json()
    produto = ProdutoEstoque.query.get(data['id'])
    
    if produto:
        # Atualiza um produto existente
        produto.nome = data['nome']
        produto.valor = data['valor']
        produto.quantidade = data['quantidade']
        mensagem = "Produto atualizado com sucesso!"
    else:
        # Cria um novo produto
        novo_produto = ProdutoEstoque(
            id=data['id'],
            nome=data['nome'],
            valor=data['valor'],
            quantidade=data['quantidade']
        )
        db.session.add(novo_produto)
        mensagem = "Novo produto adicionado com sucesso!"

    try:
        db.session.commit()
        return jsonify({'mensagem': mensagem}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@estoque_bp.route('/estoque/alerta', methods=['GET'])
def get_alerta_estoque():
    """Retorna a lista de produtos com estoque baixo."""
    produtos_alerta = ProdutoEstoque.query.filter(ProdutoEstoque.quantidade <= 10).all()
    
    if not produtos_alerta:
        return jsonify({'mensagem': 'Nenhum produto com estoque baixo no momento.'})

    lista_alerta = []
    for p in produtos_alerta:
        lista_alerta.append({
            'nome': p.nome,
            'quantidade_atual': p.quantidade
        })

    return jsonify({'produtos': lista_alerta})

@estoque_bp.route('/estoque/saida', methods=['POST'])
def lancar_saida_estoque():
    """
    Lança uma saída de estoque para vendas delivery, registrando a transação.
    """
    data = request.get_json()
    plataforma = data.get('plataforma')
    produto_id = data.get('id')
    quantidade = data.get('quantidade')

    if not produto_id or not quantidade:
        return jsonify({'erro': 'ID do produto e quantidade são obrigatórios.'}), 400

    produto = ProdutoEstoque.query.get(produto_id)
    if not produto:
        return jsonify({'erro': 'Produto não encontrado.'}), 404
    
    if produto.quantidade < quantidade:
        return jsonify({'erro': 'Quantidade insuficiente em estoque.'}), 400

    try:
        # Define o fuso horário de São Paulo
        fuso_horario_sp = pytz.timezone('America/Sao_Paulo')
        agora = datetime.now(fuso_horario_sp)
        
        nova_venda = Venda(
            valor_total=0,
            forma_pagamento=f'Plataforma: {plataforma}',
            valor_recebido=0,
            data_hora=agora,
            tipo_venda='delivery',
            plataforma=plataforma
        )
        db.session.add(nova_venda)
        db.session.flush()

        item_venda = VendaItem(
            venda_id=nova_venda.id,
            produto_id=produto_id,
            quantidade=quantidade
        )
        db.session.add(item_venda)

        produto.quantidade -= quantidade
        
        db.session.commit()

        return jsonify({'mensagem': 'Saída de estoque lançada com sucesso!'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': 'Erro ao registrar saída de estoque: ' + str(e)}), 500