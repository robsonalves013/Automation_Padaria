from flask import Blueprint, jsonify, request
from extensions import db
from models import ProdutoEstoque

estoque_bp = Blueprint('estoque_bp', __name__)

@estoque_bp.route('/estoque', methods=['GET'])
def get_estoque():
    """Retorna a lista completa de produtos em estoque."""
    produtos = ProdutoEstoque.query.order_by(ProdutoEstoque.nome).all()
    lista_estoque = []
    for produto in produtos:
        produto_dict = produto.to_dict()
        produto_dict['alerta_reposicao'] = produto.quantidade <= 10  # Exemplo de regra
        lista_estoque.append(produto_dict)
        
    return jsonify({'estoque': lista_estoque})

@estoque_bp.route('/estoque/produto', methods=['POST'])
def add_or_update_produto():
    """Adiciona um novo produto ou atualiza um existente."""
    data = request.get_json()
    produto_id = data.get('id')
    
    if not produto_id:
        return jsonify({'erro': 'ID do produto é obrigatório.'}), 400

    produto = ProdutoEstoque.query.get(produto_id)
    if produto:
        # Atualiza o produto existente
        produto.nome = data.get('nome', produto.nome)
        produto.valor = data.get('valor', produto.valor)
        produto.quantidade = data.get('quantidade', produto.quantidade)
        mensagem = 'atualizado com sucesso'
    else:
        # Adiciona um novo produto
        novo_produto = ProdutoEstoque(
            id=produto_id,
            nome=data['nome'],
            valor=data['valor'],
            quantidade=data['quantidade']
        )
        db.session.add(novo_produto)
        mensagem = 'adicionado com sucesso'
        
    db.session.commit()
    return jsonify({'mensagem': f'Produto {mensagem}.'})

@estoque_bp.route('/estoque/alerta', methods=['GET'])
def get_alertas():
    """Retorna produtos com estoque baixo (ex: <= 10 unidades)."""
    produtos_alerta = ProdutoEstoque.query.filter(ProdutoEstoque.quantidade <= 10).all()
    if not produtos_alerta:
        return jsonify({'mensagem': 'Nenhum produto com estoque baixo.', 'produtos_alerta': []}), 200

    return jsonify({'produtos_alerta': [p.to_dict() for p in produtos_alerta]})

@estoque_bp.route('/estoque/produto/<string:produto_id>', methods=['DELETE'])
def delete_produto(produto_id):
    """Deleta um produto do estoque."""
    produto = ProdutoEstoque.query.get(produto_id)
    if not produto:
        return jsonify({'erro': 'Produto não encontrado.'}), 404
    
    try:
        db.session.delete(produto)
        db.session.commit()
        return jsonify({'mensagem': f'Produto {produto.nome} removido do estoque.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500