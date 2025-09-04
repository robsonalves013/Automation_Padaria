# Arquivo: email_sender.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

def send_email(subject, body, to_email):
    """
    Função para enviar um e-mail.
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = Config.MAIL_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT)
        server.starttls()
        server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(Config.MAIL_SENDER, to_email, text)
        server.quit()
        print(f"E-mail '{subject}' enviado com sucesso para {to_email}.")
        return True
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")
        return False