from flask import Blueprint, jsonify
from models import Venda, VendaItem, ProdutoEstoque
from datetime import datetime, date, timedelta

relatorios_bp = Blueprint('relatorios_bp', __name__)

@relatorios_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    """Retorna um relatório de vendas do dia atual."""
    hoje = date.today()
    vendas_hoje = Venda.query.filter(
        db.func.date(Venda.data_hora) == hoje
    ).order_by(Venda.data_hora).all()

    if not vendas_hoje:
        return jsonify({'mensagem': 'Nenhuma venda registrada hoje.', 'vendas': []})

    lista_vendas = []
    for venda in vendas_hoje:
        itens_vendidos = []
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            itens_vendidos.append({
                'nome': produto.nome if produto else 'Produto Desconhecido',
                'quantidade': item_venda.quantidade
            })
        lista_vendas.append({
            'id': venda.id,
            'valor_total': venda.valor_total,
            'data_hora': venda.data_hora,
            'forma_pagamento': venda.forma_pagamento,
            'itens_vendidos': itens_vendidos
        })
    
    return jsonify({'vendas': lista_vendas})

@relatorios_bp.route('/relatorios/mensal', methods=['GET'])
def relatorio_mensal():
    """Retorna um relatório de vendas do mês atual."""
    hoje = datetime.now()
    primeiro_dia_mes = hoje.replace(day=1)
    
    vendas_mes = Venda.query.filter(
        Venda.data_hora >= primeiro_dia_mes
    ).order_by(Venda.data_hora).all()

    if not vendas_mes:
        return jsonify({'mensagem': 'Nenhuma venda registrada este mês.', 'vendas': []})
    
    return jsonify({'vendas': [v.to_dict() for v in vendas_mes]})

@relatorios_bp.route('/relatorios/geral', methods=['GET'])
def relatorio_geral():
    """Retorna um relatório de todas as vendas."""
    todas_vendas = Venda.query.order_by(Venda.data_hora.desc()).all()
    if not todas_vendas:
        return jsonify({'mensagem': 'Nenhuma venda registrada.'})
        
    return jsonify({'vendas': [v.to_dict() for v in todas_vendas]})

@relatorios_bp.route('/relatorios/delivery', methods=['GET'])
def relatorio_delivery():
    """Retorna um relatório de todas as vendas de delivery."""
    vendas_delivery = Venda.query.filter_by(tipo_venda='delivery').order_by(Venda.data_hora.desc()).all()
    if not vendas_delivery:
        return jsonify({'mensagem': 'Nenhuma venda de delivery registrada.'})
    
    return jsonify({'vendas': [v.to_dict() for v in vendas_delivery]})