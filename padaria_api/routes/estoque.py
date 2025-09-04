from flask import Blueprint, jsonify, request
from models import db, ProdutoEstoque

estoque_bp = Blueprint('estoque_bp', __name__)

@estoque_bp.route('/estoque', methods=['GET'])
def get_estoque():
    """Retorna a lista completa de produtos em estoque."""
    produtos = ProdutoEstoque.query.all()
    lista_produtos = []
    for p in produtos:
        alerta = p.quantidade <= 10  # Exemplo de lógica de alerta
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
    Lança uma saída de estoque (ex: para vendas delivery).
    Não registra uma venda, apenas decrementa a quantidade do produto.
    """
    data = request.get_json()
    produto_id = data.get('id')
    quantidade = data.get('quantidade')

    if not produto_id or not quantidade:
        return jsonify({'erro': 'ID do produto e quantidade são obrigatórios.'}), 400

    produto = ProdutoEstoque.query.get(produto_id)
    if not produto:
        return jsonify({'erro': 'Produto não encontrado.'}), 404
    
    if produto.quantidade < quantidade:
        return jsonify({'erro': 'Quantidade insuficiente em estoque.'}), 400

    produto.quantidade -= quantidade
    db.session.commit()

    return jsonify({'mensagem': f'Saída de {quantidade} unidades do produto {produto.nome} registrada com sucesso.'})