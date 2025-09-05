from flask import Blueprint, jsonify, request
from extensions import db
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
    vendas = Venda.query.filter(db.func.date(Venda.data_hora) == hoje).order_by(Venda.data_hora.asc()).all()
    return {'vendas': [formatar_venda(v) for v in vendas], 'mensagem': 'Nenhuma venda registrada hoje.'}

def get_vendas_mensais():
    primeiro_dia_mes = datetime.now(fuso_horario_sp).replace(day=1).date()
    vendas = Venda.query.filter(db.func.date(Venda.data_hora) >= primeiro_dia_mes).order_by(Venda.data_hora.asc()).all()
    return {'vendas': [formatar_venda(v) for v in vendas], 'mensagem': 'Nenhuma venda registrada este mês.'}

def get_vendas_gerais():
    vendas = Venda.query.order_by(Venda.data_hora.desc()).all()
    return {'vendas': [formatar_venda(v) for v in vendas], 'mensagem': 'Nenhuma venda registrada.'}

def get_vendas_delivery():
    vendas = Venda.query.filter_by(tipo_venda='delivery').order_by(Venda.data_hora.desc()).all()
    return {'vendas': [formatar_venda(v) for v in vendas], 'mensagem': 'Nenhuma venda delivery registrada.'}


@relatorios_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    return jsonify(get_vendas_diarias())

@relatorios_bp.route('/relatorios/mensal', methods=['GET'])
def relatorio_mensal():
    return jsonify(get_vendas_mensais())

@relatorios_bp.route('/relatorios/geral', methods=['GET'])
def relatorio_geral():
    return jsonify(get_vendas_gerais())

@relatorios_bp.route('/relatorios/delivery', methods=['GET'])
def relatorio_delivery():
    return jsonify(get_vendas_delivery())

@relatorios_bp.route('/relatorios/enviar-email', methods=['POST'])
def enviar_relatorio_email():
    data = request.get_json()
    email_destinatario = data.get('email')
    tipo_relatorio = data.get('tipo_relatorio')

    if not email_destinatario or not tipo_relatorio:
        return jsonify({'erro': 'Dados insuficientes.'}), 400

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

        return jsonify({'mensagem': 'Relatório enviado com sucesso!'}), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao enviar e-mail: {str(e)}'}), 500