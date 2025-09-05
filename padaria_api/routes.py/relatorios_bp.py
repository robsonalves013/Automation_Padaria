from flask import Blueprint, jsonify, request
from extensions import db
from models import Venda, VendaItem, ProdutoEstoque
from datetime import datetime, date, timedelta
import pytz
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

relatorios_bp = Blueprint('relatorios_bp', __name__)

# Fuso horário de São Paulo
fuso_horario_sp = pytz.timezone('America/Sao_Paulo')

def formatar_venda(venda):
    """Função auxiliar para formatar um objeto Venda em um dicionário JSON."""
    if not venda:
        return None

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
    return venda_dict

def get_vendas_diarias():
    hoje = datetime.now(fuso_horario_sp).date()
    vendas_hoje = Venda.query.filter(
        db.func.date(Venda.data_hora) == hoje,
        Venda.status != 'cancelada'
    ).order_by(Venda.data_hora.desc()).all()
    
    if not vendas_hoje:
        return {'mensagem': 'Nenhuma venda registrada hoje.', 'vendas': []}
    
    vendas_formatadas = [formatar_venda(v) for v in vendas_hoje]
    return {'mensagem': 'Relatório de vendas diárias gerado com sucesso.', 'vendas': vendas_formatadas}

def get_vendas_mensais():
    hoje = datetime.now(fuso_horario_sp)
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    vendas_mes = Venda.query.filter(
        Venda.data_hora >= inicio_mes,
        Venda.status != 'cancelada'
    ).order_by(Venda.data_hora.desc()).all()
    
    if not vendas_mes:
        return {'mensagem': 'Nenhuma venda registrada este mês.', 'vendas': []}
        
    vendas_formatadas = [formatar_venda(v) for v in vendas_mes]
    return {'mensagem': 'Relatório de vendas mensais gerado com sucesso.', 'vendas': vendas_formatadas}

def get_vendas_gerais():
    vendas = Venda.query.filter(Venda.status != 'cancelada').order_by(Venda.data_hora.desc()).all()
    if not vendas:
        return {'mensagem': 'Nenhuma venda registrada no sistema.', 'vendas': []}

    vendas_formatadas = [formatar_venda(v) for v in vendas]
    return {'mensagem': 'Relatório de vendas geral gerado com sucesso.', 'vendas': vendas_formatadas}

def get_vendas_delivery():
    vendas_delivery = Venda.query.filter(
        Venda.tipo_venda == 'delivery',
        Venda.status != 'cancelada'
    ).order_by(Venda.data_hora.desc()).all()

    if not vendas_delivery:
        return {'mensagem': 'Nenhuma venda de delivery registrada.', 'vendas': []}
    
    vendas_formatadas = [formatar_venda(v) for v in vendas_delivery]
    return {'mensagem': 'Relatório de vendas de delivery gerado com sucesso.', 'vendas': vendas_formatadas}


@relatorios_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    relatorio = get_vendas_diarias()
    return jsonify(relatorio)

@relatorios_bp.route('/relatorios/mensal', methods=['GET'])
def relatorio_mensal():
    relatorio = get_vendas_mensais()
    return jsonify(relatorio)

@relatorios_bp.route('/relatorios/geral', methods=['GET'])
def relatorio_geral():
    relatorio = get_vendas_gerais()
    return jsonify(relatorio)

@relatorios_bp.route('/relatorios/delivery', methods=['GET'])
def relatorio_delivery():
    relatorio = get_vendas_delivery()
    return jsonify(relatorio)

@relatorios_bp.route('/relatorios/enviar-email', methods=['POST'])
def enviar_relatorio_por_email():
    data = request.get_json()
    email_destinatario = data.get('email_destinatario')
    tipo_relatorio = 'geral' # Envia o relatório geral por padrão

    if not email_destinatario:
        return jsonify({'erro': 'Email do destinatário é obrigatório.'}), 400

    relatorio_geradores = {
        'diario': get_vendas_diarias,
        'mensal': get_vendas_mensais,
        'geral': get_vendas_gerais,
        'delivery': get_vendas_delivery
    }

    if tipo_relatorio not in relatorio_geradores:
        return jsonify({'erro': 'Tipo de relatório inválido.'}), 400

    relatorio_data = relatorio_geradores[tipo_relatorio]()
    assunto = f"Relatório de Vendas: {tipo_relatorio.capitalize()}"

    if not relatorio_data.get('vendas'):
        return jsonify({'mensagem': relatorio_data['mensagem']}), 200

    corpo_email = "<h2>Relatório de Vendas</h2>"
    for venda in relatorio_data['vendas']:
        corpo_email += f"<p>Data/Hora: {venda['data_hora']}, Valor: R$ {venda['valor_total']}, Tipo: {venda['tipo_venda']}</p>"

    try:
        msg = MIMEMultipart()
        msg['From'] = Config.EMAIL_HOST_USER
        msg['To'] = email_destinatario
        msg['Subject'] = assunto
        
        msg.attach(MIMEText(corpo_email, 'html'))

        server = smtplib.SMTP(Config.EMAIL_HOST, Config.EMAIL_PORT)
        server.starttls()
        server.login(Config.EMAIL_HOST_USER, Config.EMAIL_HOST_PASSWORD)
        text = msg.as_string()
        server.sendmail(Config.EMAIL_HOST_USER, email_destinatario, text)
        server.quit()

        return jsonify({'mensagem': f'Relatório de vendas {tipo_relatorio} enviado para {email_destinatario}.'})
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return jsonify({'erro': 'Não foi possível enviar o e-mail. Verifique as configurações.'}), 500