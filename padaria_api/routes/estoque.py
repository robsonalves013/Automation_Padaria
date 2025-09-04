from flask import Blueprint, jsonify, request
from models import db, ProdutoEstoque, Venda, VendaItem
from datetime import datetime

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
        mensagem = "Produto cadastrado com sucesso!"

    db.session.commit()
    return jsonify({'mensagem': mensagem})

@estoque_bp.route('/estoque/alerta', methods=['GET'])
def get_alertas_estoque():
    """Retorna produtos com estoque abaixo do limite de alerta."""
    produtos_alerta = ProdutoEstoque.query.filter(ProdutoEstoque.quantidade <= 10).all()
    if not produtos_alerta:
        return jsonify({'mensagem': 'Nenhum produto com estoque baixo.'})

    lista_alertas = [{
        'id': p.id,
        'nome': p.nome,
        'quantidade_atual': p.quantidade
    } for p in produtos_alerta]
    
    return jsonify({'produtos': lista_alertas})

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
        nova_venda = Venda(
            valor_total=0,
            forma_pagamento=f'Plataforma: {plataforma}',
            valor_recebido=0,
            data_hora=datetime.now(),
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

        return jsonify({'mensagem': f'Saída de {quantidade} unidades do produto {produto.nome} para {plataforma} registrada com sucesso.'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao processar o lançamento: {str(e)}'}), 500