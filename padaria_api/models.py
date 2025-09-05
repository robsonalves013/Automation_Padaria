from app import db
from datetime import datetime
import pytz

fuso_horario_sp = pytz.timezone('America/Sao_Paulo')

class ProdutoEstoque(db.Model):
    __tablename__ = 'produto_estoque'
    id = db.Column(db.String(50), primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'valor': self.valor,
            'quantidade': self.quantidade
        }

class Venda(db.Model):
    __tablename__ = 'venda'
    id = db.Column(db.Integer, primary_key=True)
    valor_total = db.Column(db.Float, nullable=False)
    forma_pagamento = db.Column(db.String(50), nullable=False)
    valor_recebido = db.Column(db.Float, nullable=False)
    data_hora = db.Column(db.DateTime, default=lambda: datetime.now(fuso_horario_sp))
    tipo_venda = db.Column(db.String(50), nullable=False, default='balcao')
    plataforma = db.Column(db.String(50))
    status = db.Column(db.String(50), default='concluida')
    observacao_cancelamento = db.Column(db.String(255))
    
    itens_vendidos = db.relationship('VendaItem', backref='venda', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'valor_total': self.valor_total,
            'forma_pagamento': self.forma_pagamento,
            'valor_recebido': self.valor_recebido,
            'data_hora': self.data_hora,
            'tipo_venda': self.tipo_venda,
            'plataforma': self.plataforma,
            'status': self.status,
            'observacao_cancelamento': self.observacao_cancelamento
        }

class VendaItem(db.Model):
    __tablename__ = 'venda_item'
    id = db.Column(db.Integer, primary_key=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('venda.id'), nullable=False)
    produto_id = db.Column(db.String(50), db.ForeignKey('produto_estoque.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    
    produto = db.relationship('ProdutoEstoque', backref='venda_itens')
    
    def to_dict(self):
        return {
            'id': self.id,
            'venda_id': self.venda_id,
            'produto_id': self.produto_id,
            'quantidade': self.quantidade
        }