from flask import Blueprint, jsonify
from models import Venda, VendaItem, ProdutoEstoque, db
from datetime import datetime, date, timedelta
import pytz

relatorios_bp = Blueprint('relatorios_bp', __name__)

# Fuso horário de São Paulo
fuso_horario_sp = pytz.timezone('America/Sao_Paulo')

@relatorios_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    """Retorna um relatório de vendas do dia atual."""
    hoje = datetime.now(fuso_horario_sp).date()
    vendas_hoje = Venda.query.filter(
        db.func.date(Venda.data_hora) == hoje
    ).order_by(Venda.data_hora).all()

    if not vendas_hoje:
        return jsonify({'mensagem': 'Nenhuma venda registrada hoje.', 'vendas': []})

    lista_vendas = []
    for venda in vendas_hoje:
        # Usa o método to_dict do modelo Venda para obter todos os detalhes
        venda_dict = venda.to_dict()
        
        # Formata a data_hora no fuso horário de São Paulo para exibir corretamente
        data_hora_sp = venda.data_hora.astimezone(fuso_horario_sp)
        venda_dict['data_hora'] = data_hora_sp.isoformat() # Garante que o JS possa parsear

        # Ajusta os itens vendidos para incluir o nome do produto
        itens_vendidos = []
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            itens_vendidos.append({
                'nome': produto.nome if produto else 'Produto Desconhecido',
                'quantidade': item_venda.quantidade
            })
        venda_dict['itens_vendidos'] = itens_vendidos

        lista_vendas.append(venda_dict)
    
    return jsonify({'vendas': lista_vendas})


@relatorios_bp.route('/relatorios/mensal', methods=['GET'])
def relatorio_mensal():
    """Retorna um relatório de vendas do mês atual."""
    agora = datetime.now(fuso_horario_sp)
    primeiro_dia_mes = agora.replace(day=1)
    
    vendas_mes = Venda.query.filter(
        Venda.data_hora >= primeiro_dia_mes
    ).order_by(Venda.data_hora).all()

    if not vendas_mes:
        return jsonify({'mensagem': 'Nenhuma venda registrada este mês.', 'vendas': []})
    
    # Adiciona a lógica para incluir status e observação também no relatório mensal
    lista_vendas = []
    for venda in vendas_mes:
        venda_dict = venda.to_dict()
        data_hora_sp = venda.data_hora.astimezone(fuso_horario_sp)
        venda_dict['data_hora'] = data_hora_sp.isoformat()
        
        itens_vendidos = []
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            itens_vendidos.append({
                'nome': produto.nome if produto else 'Produto Desconhecido',
                'quantidade': item_venda.quantidade
            })
        venda_dict['itens_vendidos'] = itens_vendidos
        lista_vendas.append(venda_dict)

    return jsonify({'vendas': lista_vendas})


@relatorios_bp.route('/relatorios/geral', methods=['GET'])
def relatorio_geral():
    """Retorna um relatório de todas as vendas."""
    todas_vendas = Venda.query.order_by(Venda.data_hora.desc()).all()
    if not todas_vendas:
        return jsonify({'mensagem': 'Nenhuma venda registrada.'})
        
    # Adiciona a lógica para incluir status e observação também no relatório geral
    lista_vendas = []
    for venda in todas_vendas:
        venda_dict = venda.to_dict()
        data_hora_sp = venda.data_hora.astimezone(fuso_horario_sp)
        venda_dict['data_hora'] = data_hora_sp.isoformat()
        
        itens_vendidos = []
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            itens_vendidos.append({
                'nome': produto.nome if produto else 'Produto Desconhecido',
                'quantidade': item_venda.quantidade
            })
        venda_dict['itens_vendidos'] = itens_vendidos
        lista_vendas.append(venda_dict)

    return jsonify({'vendas': lista_vendas})

@relatorios_bp.route('/relatorios/delivery', methods=['GET'])
def relatorio_delivery():
    """Retorna um relatório de vendas de delivery."""
    vendas_delivery = Venda.query.filter_by(tipo_venda='delivery').order_by(Venda.data_hora.desc()).all()

    if not vendas_delivery:
        return jsonify({'mensagem': 'Nenhuma venda delivery registrada.', 'vendas': []})

    lista_vendas = []
    for venda in vendas_delivery:
        # Usa o método to_dict do modelo Venda para obter todos os detalhes
        venda_dict = venda.to_dict()
        
        # Formata a data_hora no fuso horário de São Paulo para exibir corretamente
        data_hora_sp = venda.data_hora.astimezone(fuso_horario_sp)
        venda_dict['data_hora'] = data_hora_sp.isoformat()

        # Ajusta os itens vendidos para incluir o nome do produto
        itens_vendidos = []
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            itens_vendidos.append({
                'nome': produto.nome if produto else 'Produto Desconhecido',
                'quantidade': item_venda.quantidade
            })
        venda_dict['itens_vendidos'] = itens_vendidos
        
        lista_vendas.append(venda_dict)
        
    return jsonify({'vendas': lista_vendas})