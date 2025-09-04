from flask import Blueprint, jsonify, request
from models import db, Produto

estoque_bp = Blueprint('estoque', __name__)

# Cadastrar ou atualizar um produto no estoque
@estoque_bp.route('/estoque/produto', methods=['POST'])
def cadastrar_produto():
    data = request.json
    id = data.get('id')
    nome = data.get('nome')
    valor = data.get('valor')
    quantidade = data.get('quantidade', 0)

    if not id or not nome or valor is None:
        return jsonify({"erro": "ID, nome e valor são obrigatórios."}), 400

    produto = Produto.query.get(id)
    if produto:
        # Produto já existe, atualiza a quantidade e o valor
        produto.nome = nome
        produto.valor = valor
        produto.quantidade = quantidade
        db.session.commit()
        return jsonify({"mensagem": "Produto atualizado com sucesso!", "produto": {"id": produto.id, "nome": produto.nome}}), 200
    else:
        # Novo produto
        novo_produto = Produto(id=id, nome=nome, valor=valor, quantidade=quantidade)
        db.session.add(novo_produto)
        db.session.commit()
        return jsonify({"mensagem": "Produto cadastrado com sucesso!", "produto": {"id": novo_produto.id, "nome": novo_produto.nome}}), 201

# Visualizar estoque atual
@estoque_bp.route('/estoque', methods=['GET'])
def visualizar_estoque():
    produtos = Produto.query.all()
    lista_produtos = []
    for p in produtos:
        lista_produtos.append({
            'id': p.id,
            'nome': p.nome,
            'valor': p.valor,
            'quantidade': p.quantidade,
            'alerta_reposicao': p.quantidade < 10
        })
    
    return jsonify({"estoque": lista_produtos}), 200

# Gerar alerta de estoque baixo
@estoque_bp.route('/estoque/alerta', methods=['GET'])
def alerta_estoque():
    produtos_alerta = Produto.query.filter(Produto.quantidade < 10).all()
    lista_alerta = []
    for p in produtos_alerta:
        lista_alerta.append({
            'id': p.id,
            'nome': p.nome,
            'quantidade_atual': p.quantidade
        })
    
    if not lista_alerta:
        return jsonify({"mensagem": "Nenhum produto com estoque baixo."}), 200
    
    return jsonify({"alerta": "Produtos com menos de 10 unidades em estoque", "produtos": lista_alerta}), 200