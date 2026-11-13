# teste/amostras/gerar-dividas.py — gera as amostras FICTÍCIAS do teste-dividas.js (3.73): a fatura do cartão
# Porto em .xlsx e em .pdf e uma apólice de seguro em .pdf. Nenhum dado real. Uso: python3 teste/amostras/gerar-dividas.py
import os
from openpyxl import Workbook
from reportlab.pdfgen import canvas
AQUI = os.path.dirname(os.path.abspath(__file__))
ITENS = [('05/10', 'PAGAMENTO', 2500.00, 0), ('12/10', 'PADARIA EXEMPLO', 0, 45.90), ('15/10', 'PORTO SEGURO CONSORCIO 08/80', 0, 1005.00),
         ('18/10', 'PORTO SEGURO CONSORCIO 03/100', 0, 777.00), ('20/10', 'FARMACIA EXEMPLO', 0, 120.10), ('22/10', 'ESTORNO LOJA EXEMPLO', 20.00, 0)]
wb = Workbook(); ws = wb.active; ws.title = 'nacional'
ws.append(['', '', 'Crédito', 'Débito', 'Total', 'Cartão'])
ws.append(['TITULAR EXEMPLO', '', '', '', '', 'Final 4321'])
for d, desc, cr, db in ITENS: ws.append([d, desc, cr or None, db or None])
ws.append(['TOTAL', '', 2520.00, 1948.00, 1928.00, ''])
wb.create_sheet('internacional')
wb.save(os.path.join(AQUI, 'Fatura_Porto_Seguro_2026-11-05.xlsx'))
br = lambda v: ('{:,.2f}'.format(v)).replace(',', 'X').replace('.', ',').replace('X', '.')
c = canvas.Canvas(os.path.join(AQUI, 'fatura-porto-exemplo.pdf')); y = 800
for l in ['Cartao Porto Bank - TITULAR EXEMPLO - final 4321', 'Vencimento 05/11/2026', 'Total desta fatura R$ 1.928,00'] + \
         [d + ' ' + desc + ' ' + ('-' + br(cr) if cr else br(db)) for d, desc, cr, db in ITENS]:
    c.drawString(40, y, l); y -= 18
c.save()
c = canvas.Canvas(os.path.join(AQUI, 'apolice-exemplo.pdf')); y = 800
for l in ['SEGURADORA EXEMPLO - Porto Seguro Cia. de Seguros Gerais', 'Apolice n 0531.12.345678', 'Seguro Automovel - Veiculo EXEMPLO placa ABC1D23',
          'Vigencia: das 24h de 10/12/2025 as 24h de 10/12/2026', 'Premio total R$ 3.600,00', 'Forma de pagamento: 6 parcelas sem juros']:
    c.drawString(40, y, l); y -= 18
c.save()
print('ok')
