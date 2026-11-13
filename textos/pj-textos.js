/* =====================================================================
   textos/pj-textos.js — os textos da gestão da PJ (FiscalONE): Oportunidades, reforma, troca de empresas e o glossário
   fiscal, NUM ARQUIVO SÓ, para revisar quando a lei mudar (3.83)        3.83 · 13/Nov/2026
   ---------------------------------------------------------------------
   · Cada regra tem frase, "por quê" e a fonte oficial, em PT e EN. {chaves} são trocadas pelos números da conta.
   · Os números das tabelas do Simples (LC 123/2006, Anexos III e V) e as faixas ficam aqui também.
   · Nada aqui é conselho: toda regra termina em "confirme com o seu contador".
   · Carregado ANTES do código do app (const global); os verbetes entram no glossário do app (GLOSSARIO).
   ===================================================================== */
const PJ_TEXTOS = {
  fontes: {
    lc123: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
    simples: 'https://www8.receita.fazenda.gov.br/simplesnacional/',
    ec132: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
    lc214: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
    reforma: 'https://www.gov.br/receitafederal/pt-br/assuntos/reforma-tributaria',
    civil: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
    lucroReal: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/irpj'
  },
  /* LC 123/2006: [teto da receita de 12 meses, alíquota nominal, parcela a deduzir] */
  anexos: {
    III: [[180000, 0.06, 0], [360000, 0.112, 9360], [720000, 0.135, 17640], [1800000, 0.16, 35640], [3600000, 0.21, 125640], [4800000, 0.33, 648000]],
    V: [[180000, 0.155, 0], [360000, 0.18, 4500], [720000, 0.195, 9900], [1800000, 0.205, 17100], [3600000, 0.23, 62100], [4800000, 0.305, 540000]]
  },
  /* a parte de ISS + PIS + COFINS dentro do DAS (repartição das 1ª e 2ª faixas; aproximada): é a que zera na exportação */
  partesExportacao: { III: 0.491, V: 0.3115 },
  fatorR: { limite: 0.28, folga: 0.31, inss: 0.11, irrfMarginal: 0.275 },
  regras: {
    fatorRAbaixo: {
      pt: { t: 'Fator R abaixo de 28%: a empresa paga pelo Anexo V (mais caro)', f: 'Com {extraMes}/mês a mais de pró-labore (12 meses: {extraAno}), o Fator R chega a 28% e o DAS cai de {dasV} para {dasIII} no ano (−{economiaDas}). Descontando o INSS (11%: {inss}) e o IR do pró-labore a mais (no pior caso, 27,5%: {irrf}), sobra {liquida} no ano.', p: 'No Simples, serviço do Anexo V vai para o Anexo III quando a folha (com o pró-labore) dos 12 meses é pelo menos 28% da receita dos 12 meses (LC 123/2006, art. 18, §5º-J e §5º-M).' },
      en: { t: 'Fator R below 28%: the company pays under Annex V (more expensive)', f: 'With {extraMes}/month more pro-labore (12 months: {extraAno}), Fator R reaches 28% and the DAS drops from {dasV} to {dasIII} a year (−{economiaDas}). After INSS (11%: {inss}) and the income tax on the extra pro-labore (worst case, 27.5%: {irrf}), {liquida} is left a year.', p: 'Under Simples, an Annex V service moves to Annex III when the 12-month payroll (with pro-labore) is at least 28% of the 12-month revenue (LC 123/2006, art. 18, §5-J and §5-M).' }
    },
    fatorRNoLimite: {
      pt: { t: 'Fator R no limite: {fator}%', f: 'Está acima de 28%, mas perto. Uma queda do pró-labore ou um mês de receita alta pode levar ao Anexo V. Acompanhe todo mês.', p: 'O Fator R é recalculado todo mês com os últimos 12 meses.' },
      en: { t: 'Fator R at the edge: {fator}%', f: 'It is above 28%, but close. A lower pro-labore or a high-revenue month can push it to Annex V. Check it every month.', p: 'Fator R is recalculated every month over the last 12 months.' }
    },
    fatorROk: {
      pt: { t: 'Fator R em {fator}%: está bem', f: 'Acima de 28% com folga: a empresa fica no Anexo III.', p: 'Folha dos 12 meses ÷ receita dos 12 meses ≥ 28% → Anexo III.' },
      en: { t: 'Fator R at {fator}%: fine', f: 'Comfortably above 28%: the company stays in Annex III.', p: '12-month payroll ÷ 12-month revenue ≥ 28% → Annex III.' }
    },
    exportacao: {
      pt: { t: 'Exportação de serviço: o DAS pode estar alto', f: 'Nos 12 meses, {parte}% da receita veio do exterior ({exterior}). Com a exportação separada, o DAS estimado seria {comExp}; sem separar, {semExp}. Foi pago {pago}, o que parece NÃO ter separado a receita de exportação (diferença estimada: {diferenca}).', p: 'No Simples, a receita de exportação de serviços é informada à parte no PGDAS-D, e as parcelas de ISS, PIS e COFINS dela ficam zeradas (LC 123/2006, art. 18, §14). Estimativa: confira a apuração com o contador.' },
      en: { t: 'Service exports: the DAS may be too high', f: 'Over 12 months, {parte}% of revenue came from abroad ({exterior}). With exports reported separately, the estimated DAS would be {comExp}; without, {semExp}. {pago} was paid, which looks like exports were NOT separated (estimated difference: {diferenca}).', p: 'Under Simples, service export revenue is reported separately in PGDAS-D and its ISS, PIS and COFINS shares are zero (LC 123/2006, art. 18, §14). Estimate: check the calculation with your accountant.' }
    },
    exportacaoOk: {
      pt: { t: 'Exportação de serviço: o DAS parece separado', f: '{parte}% da receita veio do exterior. O DAS pago ({pago}) está perto da estimativa com a exportação separada ({comExp}).', p: 'LC 123/2006, art. 18, §14.' },
      en: { t: 'Service exports: the DAS looks separated', f: '{parte}% of revenue came from abroad. The DAS paid ({pago}) is close to the estimate with exports separated ({comExp}).', p: 'LC 123/2006, art. 18, §14.' }
    },
    despesasCasa: {
      pt: { t: 'Despesas de casa usadas no trabalho (internet, energia, equipamento)', f: 'No {regime}, o imposto é sobre a RECEITA: passar a despesa para a PJ NÃO reduz o DAS. Vale para organizar, para provar a atividade e, a partir da reforma, possivelmente para crédito de IBS/CBS se a empresa optar pelo regime híbrido (fora do DAS). Só no Lucro Real a despesa reduz o IRPJ e a CSLL.', p: 'Simples (LC 123/2006) e Lucro Presumido tributam a receita; o crédito de IBS/CBS vem da LC 214/2025.' },
      en: { t: 'Home costs used for work (internet, power, equipment)', f: 'Under {regime}, tax is on REVENUE: moving the cost to the company does NOT reduce the DAS. It helps organisation, proves the activity and, after the reform, may give IBS/CBS credit if the company opts for the hybrid regime (outside the DAS). Only under Lucro Real does the cost reduce IRPJ and CSLL.', p: 'Simples (LC 123/2006) and Lucro Presumido tax revenue; IBS/CBS credit comes from LC 214/2025.' }
    },
    mistura: {
      pt: { t: 'Mistura PF × PJ: {n} lançamento(s)', f: '{total} em contas da empresa pagas no CPF ou contas pessoais pagas pela conta da PJ ({exemplos}). Misturar pode virar "confusão patrimonial": pague as contas da empresa pela conta da empresa e as suas pela sua.', p: 'Código Civil, art. 50 (confusão patrimonial).' },
      en: { t: 'Personal × company mix: {n} entr(ies)', f: '{total} in company bills paid personally or personal bills paid from the company account ({exemplos}). Mixing can become "commingling of assets": pay company bills from the company account and yours from yours.', p: 'Civil Code, art. 50 (commingling of assets).' }
    },
    reforma: {
      pt: { t: 'Reforma tributária: o que muda e quando', f: '2026: ano de teste (CBS 0,9% e IBS 0,1% destacados na nota, sem pagar a mais). 2027: começa a CBS e o Simples pode escolher entre recolher IBS/CBS dentro do DAS ou no regime híbrido (fora do DAS, com crédito). 2029 a 2032: o ICMS e o ISS diminuem aos poucos. 2033: só IBS e CBS. Revisar em: {revisar}.', p: 'EC 132/2023 e LC 214/2025.' },
      en: { t: 'Tax reform: what changes and when', f: '2026: test year (CBS 0.9% and IBS 0.1% shown on invoices, nothing extra paid). 2027: CBS starts and Simples companies may choose between paying IBS/CBS inside the DAS or the hybrid regime (outside the DAS, with credits). 2029 to 2032: ICMS and ISS phase down. 2033: only IBS and CBS. Review on: {revisar}.', p: 'EC 132/2023 and LC 214/2025.' }
    },
    contador: { pt: 'Confirme com o seu contador.', en: 'Confirm with your accountant.' }
  },
  /* troca de empresas: os passos */
  troca: [
    ['clientes', 'Transferir clientes e contratos para o CNPJ ativo', 'Move clients and contracts to the active company'],
    ['recebimento', 'Mandar aos clientes os dados de recebimento da empresa ativa', 'Send clients the active company\'s payment details'],
    ['assinaturas', 'Passar as assinaturas e serviços para o CNPJ ativo', 'Move subscriptions and services to the active company'],
    ['encerrar', 'Encerrar a outra empresa com o contador (baixa do CNPJ e das inscrições)', 'Close the other company with your accountant (deregister the CNPJ and registrations)']
  ],
  /* o plano de contas simples (custos da PJ) */
  plano: [
    ['impostos', 'Impostos', 'Taxes'], ['contador', 'Contador e taxas', 'Accountant and fees'], ['software', 'Software e IA', 'Software and AI'],
    ['internet', 'Internet e telefone', 'Internet and phone'], ['equipamentos', 'Equipamentos', 'Equipment'], ['bancos', 'Bancos e câmbio', 'Banking and FX'],
    ['outros', 'Outros custos', 'Other costs'], ['prolabore', 'Pró-labore', 'Pro-labore'], ['lucros', 'Distribuição de lucros', 'Profit distribution']
  ]
};

/* ---------- o glossário fiscal (entra no glossário do app, categoria FiscalONE) ---------- */
(function () {
  if (typeof GLOSSARIO === 'undefined') return;
  var F = PJ_TEXTOS.fontes, a = function (u, t) { return ' <a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; };
  var V = function (k, t, te, pi, pm, px, ei, em, ex, link) {
    var l = link ? a(link[0], link[1]) : '', le = link ? a(link[0], link[2] || link[1]) : '';
    GLOSSARIO.push({ k: k, t: t, te: te, c: 'FiscalONE', ce: 'FiscalONE', pt: { iniciante: pi + l, medio: pm + l, expert: px + l }, en: { iniciante: ei + le, medio: em + le, expert: ex + le } });
  };
  V('simples-nacional', 'Simples Nacional', 'Simples Nacional',
    'Um jeito simplificado de a pequena empresa pagar impostos: uma guia só por mês (o DAS), calculada sobre a receita.',
    'Regime para empresas com receita de até R$ 4,8 milhões em 12 meses: vários tributos numa guia só (DAS), com alíquota que cresce com a receita.',
    'LC 123/2006: alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12, por anexo; repartição entre IRPJ, CSLL, PIS, COFINS, CPP, ISS/ICMS.',
    'A simplified way for small companies to pay taxes: one monthly slip (the DAS), based on revenue.',
    'Regime for companies with up to R$ 4.8 million revenue over 12 months: several taxes in one slip (DAS), with a rate that grows with revenue.',
    'LC 123/2006: effective rate = (RBT12 × nominal rate − deduction) ÷ RBT12, per annex; split among IRPJ, CSLL, PIS, COFINS, CPP, ISS/ICMS.', [F.lc123, 'Lei Complementar 123/2006', 'Supplementary Law 123/2006']);
  V('anexos-simples', 'Anexos do Simples', 'Simples annexes',
    'São tabelas de alíquotas. Cada atividade cai num anexo; os de serviço mais comuns são o III (mais barato) e o V (mais caro).',
    'Cinco tabelas (I a V) por tipo de atividade. Muitos serviços intelectuais ficam no III ou no V, conforme o Fator R.',
    'Anexo III começa em 6% e o V em 15,5% de alíquota nominal; as faixas vão até R$ 4,8 milhões de RBT12.',
    'Rate tables. Each activity falls in one annex; the most common service ones are III (cheaper) and V (more expensive).',
    'Five tables (I to V) by activity. Many professional services fall in III or V depending on Fator R.',
    'Annex III starts at a 6% nominal rate and V at 15.5%; brackets go up to R$ 4.8 million RBT12.', [F.lc123, 'LC 123/2006, Anexos III e V', 'LC 123/2006, Annexes III and V']);
  V('fator-r', 'Fator R', 'Fator R',
    'A conta que decide se a sua empresa de serviço paga pelo Anexo III ou pelo V: folha (com o pró-labore) ÷ receita, nos últimos 12 meses.',
    'Se a folha dos 12 meses for pelo menos 28% da receita dos 12 meses, o serviço vai para o Anexo III; abaixo disso, Anexo V.',
    'LC 123/2006, art. 18, §5º-J e §5º-M: folha inclui pró-labore, salários e encargos (FGTS, CPP); recalculado mês a mês.',
    'The ratio that decides whether your service company pays under Annex III or V: payroll (with pro-labore) ÷ revenue over the last 12 months.',
    'If 12-month payroll is at least 28% of 12-month revenue, the service goes to Annex III; below that, Annex V.',
    'LC 123/2006, art. 18, §5-J and §5-M: payroll includes pro-labore, wages and charges (FGTS, CPP); recalculated monthly.', [F.lc123, 'LC 123/2006, art. 18', 'LC 123/2006, art. 18']);
  V('das', 'DAS', 'DAS',
    'A guia mensal do Simples Nacional. Vence todo dia 20.',
    'Documento de Arrecadação do Simples Nacional: gerado no PGDAS-D a partir da receita do mês; vence no dia 20 do mês seguinte.',
    'Apuração no PGDAS-D por competência; receita de exportação informada à parte (sem ISS/PIS/COFINS); DAS-MEI é fixo.',
    'The monthly Simples Nacional slip. Due on the 20th.',
    'Simples Nacional collection slip: generated in PGDAS-D from the month\'s revenue; due on the 20th of the following month.',
    'Calculated in PGDAS-D by accrual month; export revenue reported separately (no ISS/PIS/COFINS); DAS-MEI is a fixed amount.', [F.simples, 'Portal do Simples Nacional', 'Simples Nacional portal']);
  V('darf-pj', 'DARF da PJ', 'Company DARF',
    'Guia de impostos federais fora do DAS. Na PJ pequena, é comum para o IR e o INSS retidos do pró-labore.',
    'Documento de Arrecadação de Receitas Federais; o do pró-labore leva o IRRF e o INSS retidos do sócio, até o dia 20.',
    'Códigos de receita variam (IRRF 0561; previdência via DCTFWeb/eSocial); vence no dia 20 do mês seguinte à competência.',
    'Federal tax slip outside the DAS. In a small company, typical for the withholding on pro-labore.',
    'Federal revenue collection slip; the pro-labore one carries the partner\'s withheld income tax and INSS, by the 20th.',
    'Revenue codes vary (IRRF 0561; social security via DCTFWeb/eSocial); due on the 20th of the following month.', [F.reforma.replace('reforma-tributaria', ''), 'Receita Federal', 'Brazilian Federal Revenue']);
  V('pro-labore', 'Pró-labore', 'Pro-labore',
    'O "salário" do sócio que trabalha na empresa. Paga INSS e pode pagar IR.',
    'Remuneração do sócio pelo trabalho; entra na folha do Fator R; tem INSS (11% do sócio) e IRRF pela tabela.',
    'Base de contribuição individual (11%, até o teto) e IRRF progressivo; no Simples Anexo III/V a CPP patronal está no DAS (exceto Anexo IV).',
    'The pay of the partner who works in the company. It bears INSS and may bear income tax.',
    'The partner\'s pay for work; counts as payroll for Fator R; has INSS (11% from the partner) and income tax by the table.',
    'Individual contribution base (11%, up to the ceiling) and progressive withholding; in Simples Annex III/V the employer CPP is inside the DAS (except Annex IV).', [F.lc123, 'LC 123/2006', 'LC 123/2006']);
  V('distribuicao-lucros', 'Distribuição de lucros', 'Profit distribution',
    'O lucro que a empresa passa para o sócio. Hoje, em regra, não paga IR na pessoa física.',
    'Isenta de IR para o sócio dentro dos limites apurados; na declaração, vai como rendimento isento (código 13). Mudanças de lei podem alterar.',
    'Isenção (Lei 9.249/1995, art. 10) limitada ao lucro apurado/presumido; acompanhe as propostas de tributação de dividendos e a regra de retenção acima de limites mensais.',
    'The profit the company passes to the partner. Today, as a rule, it is not taxed personally.',
    'Tax-free for the partner within the calculated limits; in the return it goes as exempt income (code 13). Law changes may alter this.',
    'Exemption (Law 9,249/1995, art. 10) limited to calculated/presumed profit; keep up with proposals to tax dividends and monthly withholding thresholds.', [F.reforma.replace('reforma-tributaria', ''), 'Receita Federal', 'Brazilian Federal Revenue']);
  V('exportacao-servicos', 'Exportação de serviços', 'Service exports',
    'Quando o cliente está fora do Brasil e paga do exterior. No Simples, parte do imposto não incide.',
    'No Simples, a receita de exportação é informada à parte e não paga ISS, PIS e COFINS dentro do DAS.',
    'LC 123/2006, art. 18, §14; exige que o resultado do serviço se verifique no exterior e o ingresso de divisas.',
    'When the client is abroad and pays from abroad. Under Simples, part of the tax does not apply.',
    'Under Simples, export revenue is reported separately and pays no ISS, PIS or COFINS inside the DAS.',
    'LC 123/2006, art. 18, §14; requires the result of the service to occur abroad and the inflow of foreign currency.', [F.lc123, 'LC 123/2006, art. 18, §14', 'LC 123/2006, art. 18, §14']);
  V('ibs-cbs', 'IBS e CBS', 'IBS and CBS',
    'Os novos impostos sobre consumo da reforma: CBS (federal) e IBS (estados e municípios). Substituem PIS, COFINS, ICMS e ISS aos poucos.',
    'Tributos sobre bens e serviços com crédito amplo; 2026 é teste, a CBS começa em 2027 e a transição vai até 2033.',
    'EC 132/2023 e LC 214/2025: IVA dual, não cumulativo, cobrança no destino; split payment e crédito financeiro.',
    'The reform\'s new consumption taxes: CBS (federal) and IBS (states and cities). They gradually replace PIS, COFINS, ICMS and ISS.',
    'Taxes on goods and services with broad credits; 2026 is a test, CBS starts in 2027 and the transition runs to 2033.',
    'EC 132/2023 and LC 214/2025: dual VAT, non-cumulative, destination-based; split payment and financial credit.', [F.lc214, 'LC 214/2025', 'LC 214/2025']);
  V('regime-hibrido', 'Regime híbrido (Simples)', 'Hybrid regime (Simples)',
    'Uma escolha que a empresa do Simples terá: pagar IBS e CBS fora do DAS, para dar crédito ao cliente empresa e tomar crédito das compras.',
    'A partir de 2027, a empresa do Simples pode recolher IBS/CBS pelo regime regular (fora do DAS) e o resto no DAS; vale a pena quando os clientes são empresas que aproveitam crédito.',
    'LC 214/2025: opção semestral; no regime regular, crédito sobre as aquisições e débito destacado na nota.',
    'A choice Simples companies will have: paying IBS and CBS outside the DAS, to give credit to business clients and take credit on purchases.',
    'From 2027, a Simples company may pay IBS/CBS under the regular regime (outside the DAS) and the rest in the DAS; worth it when clients are companies that use the credit.',
    'LC 214/2025: half-yearly option; under the regular regime, credit on purchases and tax shown on invoices.', [F.lc214, 'LC 214/2025', 'LC 214/2025']);
  V('tfe', 'TFE', 'TFE',
    'Taxa anual da Prefeitura de São Paulo para quem tem estabelecimento (mesmo em casa). Costuma vencer em julho.',
    'Taxa de Fiscalização de Estabelecimento: anual, por CNPJ, valor pela atividade.',
    'Lei municipal de São Paulo; cobrada por inscrição municipal (CCM).',
    'A yearly fee charged by the City of São Paulo to businesses with an establishment (even at home). Usually due in July.',
    'Establishment Inspection Fee: yearly, per CNPJ, amount by activity.',
    'São Paulo municipal law; charged per city registration (CCM).', null);
})();
