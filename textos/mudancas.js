/* =====================================================================
   textos/mudancas.js — a versão do app e o histórico de mudanças ("O que há de novo")   3.75 · 13/Nov/2026
   ---------------------------------------------------------------------
   A versão é escrita à mão a cada entrega, no topo da lista (VERSAO = MUDANCAS[0].v no index.html).
   Saiu do index.html na 3.48 (arrumação interna). Textos em PT; o inglês vai em textos/frases-en.js.
   Carregado ANTES do código do app (é uma const global). Troque o ?v= no index.html e no sw.js a cada versão.
   ===================================================================== */
const MUDANCAS = [
  {v:'3.75', d:'2026-11-13', t:'Contas fixas com o status de cada conta, e a família arrumada', itens:[
    'Contas fixas: no topo da tela, "Este mês" ou "Próximos 45 dias", "Por dia" ou "Por grupo" (a escolha fica guardada), e cada conta com o status: ✓ Paga (com a data e o valor pago), ⚠ Atrasada, ⏰ Vence hoje, ○ A vencer e 🔄 Débito automático. O resumo diz quanto é, quanto já foi pago, quanto falta e quanto está atrasado, com uma barra.',
    'Nos próximos 45 dias, as contas atrasadas que ficaram para trás aparecem no topo, com o total. Por grupo, cada grupo mostra o total e quantas já foram pagas.',
    '"Parece conta fixa": quando o mesmo recebedor aparece 3 meses seguidos com valor e dia parecidos, o app pergunta se quer cadastrar (dois boletos diferentes do mesmo lugar viram duas contas). O mesmo mês em anos seguidos vira conta anual (IPTU, matrícula). Respondeu "não", não pergunta de novo.',
    'Família: o aviso do 📥 diz o que falta e por quê e abre as Configurações sem trocar de app. Em "Quem é da casa", o app pergunta uma vez qual ficha é você; você (o chefe) não aparece mais, e a ficha que veio da conta pode ser juntada à sua sem perder lançamentos, o nome aparece com o apelido entre parênteses e quem não é da família fica separado. Sem o PIN da conta, "Preparar" fica travado, com o botão para criar o PIN.'
  ]},
  {v:'3.74', d:'2026-11-13', t:'Parcelados do cartão, Contas fixas e Documentos que o app pede', itens:[
    'Compras parceladas no cartão: o app lê a parcela no fim da descrição ("LOJA 03/10") e mostra em "Parcelados no cartão" (Painel e Futuro) o que ainda vem — quanto falta, em quantos meses e quanto cai em cada mês. O previsto do mês já conta cada parcela a vir como conta certa.',
    'A tela "Custos" passou a se chamar "Contas fixas" (e gastos recorrentes), que é como você procura. No Painel, um cartão "Contas fixas do mês": quantas são, o total por mês e as próximas a vencer.',
    '"Documentos que o app pede": quando chega a hora de subir um documento que se repete (a fatura do cartão Porto, o saldo das cotas do consórcio, a apólice), o app lembra em "Precisa da sua atenção" e no 📥, com o passo a passo e o botão de subir, que já abre o leitor certo. Dá para adiar 7 dias e copiar um pedido pronto para o Claude in Chrome baixar o documento.'
  ]},
  {v:'3.73', d:'2026-11-13', t:'Dívidas, fatura do cartão Porto, seguro e Mês a mês', itens:[
    'Novo cartão "Dívidas" no Painel do InvestifyONE e no do BudgetONE: consórcio, financiamento ou outra dívida, cada uma com uma barra (cheia = o que já foi pago, tracejada = o que falta), o saldo, a parcela e "quita em ~mm/aaaa (estimativa)", agrupadas pelo bem a que pertencem. O bem mostra "valor − dívida = parte sua".',
    'O patrimônio total (no Painel do InvestifyONE e no Fluxo) agora desconta as dívidas, com a linha "dívidas: −R$ X" à vista. Cada parcela paga que o app reconhece baixa o saldo (estimativa) até a próxima atualização; a parcela continua como gasto fixo no orçamento.',
    'Posições do consórcio por arquivo CSV (grupo e cota, % pago, saldo, parcela): uma prévia antes de importar; a cota que já existe é atualizada e o saldo antigo fica no histórico.',
    'Fatura do cartão Porto (planilha .xlsx ou PDF): o app lê as compras e as guarda como detalhe do pagamento "PORTOSEG" que veio do banco, sem gasto em dobro, e mostra a diferença se houver. As parcelas "PORTO SEGURO CONSORCIO" vão para a cota certa pela parcela; se houver dúvida, fica "A confirmar" para você escolher.',
    'Em Custos, "🛡️ Seguro (apólice)": leia a apólice (PDF ou foto) ou preencha à mão; o seguro vira um compromisso com as parcelas do prêmio, e 30 dias antes do fim da vigência o app lembra de renovar.',
    '"Mês a mês" refeito: a barra de cada mês é o que sobrou na conta, tudo o que entrou menos o que foi gasto e o que foi para investimento (aportes menos resgates), numa cor só.',
    'Marcas no mês: ★ renda extraordinária, 📈 investiu mais que a renda média do mês e 🔗 quando as duas estão ligadas (por exemplo, "rescisão investida no mês seguinte"). Toque no mês para ver os números numa linha.',
    'Duas vistas, com a escolha guardada: "Sobrou na conta" e "Dia a dia" (a renda que se repete menos o que foi gasto). A escala ignora o mês fora da curva, que aparece cortado (⫽) com o valor inteiro.',
    'Quando entra um valor maior que o dobro da sua renda de sempre, o app pergunta em "Precisa da sua atenção" (e no 📥) se é renda extraordinária.',
    'As mensagens de segurança falam em desbloquear também nos botões e avisos que faltavam ("Desbloquear com a digital", "Desbloquear com o código de recuperação"), e "destrava" virou "libera" nas dicas.'
  ]},
  {v:'3.72', d:'2026-11-13', t:'Mensagens da nuvem mais claras', itens:[
    'As mensagens de entrar e de segurança falam em desbloquear, chave e acesso, em vez de "cadeado" (por exemplo: "Desbloqueie com o PIN ou a digital", "O acesso desta família ainda não foi liberado para você", "Você bloqueou o app").',
    'As telas de entrar, de PIN e de "MoneyTRIO bloqueado" mostram a mesma imagem de fundo do app, nos dois temas.'
  ]},
  {v:'3.71', d:'2026-11-13', t:'Textos da tela inicial mais diretos', itens:[
    'Os três cartões da tela inicial dizem o que cada app faz, sem frase de efeito, e o rodapé diz como os dados são guardados: criptografados no aparelho antes de ir para a nuvem, ou só neste aparelho, sem conta.',
    'As telas da nuvem e a dica "Onde ficam os seus dados" dizem o mesmo, sem a expressão "cadeado da família".'
  ]},
  {v:'3.70', d:'2026-11-13', t:'A declaração do IR preenche os três apps', itens:[
    'Ao importar a declaração no TaxONE, a tela mostra o que fazer com ela, sempre como escolha: montar ou atualizar a carteira do InvestifyONE com os investimentos de 31/12 (ações e ETFs no exterior com a quantidade, fundos, poupança, contas), cadastrar os dependentes em Pessoas, as fontes pagadoras em Rendas e, se quiser, a escola e o plano de saúde como contas fixas em Custos. O que já existe vem desmarcado; nada é gravado sem você confirmar.',
    '"De quem é": a conta ou o bem com "cônjuge" ou com o nome de alguém do cadastro já vem com essa pessoa escolhida.',
    'A descrição longa de cada bem (cotas de consórcio, saldo devedor por ano, valor do crédito) agora vem inteira.',
    'A leitura da declaração (até 25 páginas) continua mesmo se você sair da tela: a pílula mostra o andamento e leva de volta quando terminar.',
    'Tudo isso fica só com você: quem vê só a parte da casa não vê patrimônio, investimento nem imposto de renda.'
  ]},
  {v:'3.69', d:'2026-11-13', t:'Previsto × realizado por categoria', itens:[
    'O app prevê o gasto de cada categoria no mês: as contas certas de Custos pelo valor e pelo dia (antes de o banco mandar), a média dos últimos 6 meses com o peso da época do ano e a inflação do grupo, e as viagens registradas no Futuro. Quando a conta real chega, ela entra no lugar da prevista, sem contar duas vezes.',
    'No Painel, cada categoria mostra o que já foi, o que ainda falta do previsto, o ritmo de hoje e a meta (o limite que você digitou). A Projeção do mês diz: previsto, já foi, ainda vem (quanto em contas certas) e quanto deve sobrar, e os 3 meses seguintes.',
    'Futuro → "Viagens e eventos": registre uma viagem de carro e a gasolina extra entra no previsto.',
    'Boleto sem nome do banco ("INT PAG TIT"): quando o valor e a data batem com uma conta fixa de Custos (o valor pode variar, como o condomínio), a lista mostra o nome da conta com "A confirmar". Um toque confirma e liga o pagamento à conta; se duas contas batem, o app mostra as duas para você escolher.',
    'Viagem que passou: quando o combustível de poucos dias passa muito do normal, o app pergunta "Foi viagem?". Se foi, esses abastecimentos saem da média e o app aprende a distância do destino. Nunca marca sozinho.',
    'Fluxo: a linha de cima agora é o seu patrimônio de verdade no fim de cada mês (contas + carteira), terminando no de hoje. Onde não há o valor real, ela é estimada de trás para frente pelo que sobrou em cada mês (tracejada, sem rendimentos). Daqui em diante o app guarda uma foto do patrimônio por mês.',
    'Fluxo, embaixo: o que entrou (a renda extraordinária em amarelo com ★), o que foi gasto e o que foi para investimento, cada um na sua barra; a linha do saldo do mês é entrou menos gastou. Os quadrados do topo: patrimônio de hoje, variação do patrimônio, quanto sobrou e quanto foi para investimento.',
    'O ✨ da IA foi para a barra de cima, ao lado da lupa. A faixa de cima só aparece quando há anúncio: sem ela, a tela começa mais no alto. Em telas muito estreitas, o ✨ fica no menu 👤.',
    'Calendário do menu: a setinha agora aponta para onde ele vai. Aberto, a seta aponta para baixo (recolher); recolhido, para cima (abrir).',
  ]},
  {v:'3.68.1', d:'2026-11-13', t:'O Enter agora sempre salva o que você editou', itens:[
    'Numa janela de edição, o Enter aperta sempre o botão Salvar do rodapé. Antes, num lançamento "A confirmar", ele apertava o "✓ Confirmar como está" do alto e descartava o que você tinha mudado (apelido, categoria).'
  ]},
  {v:'3.68', d:'2026-11-13', t:'Mês a mês de verdade, apelidos e nomes', itens:[
    '"Mês a mês" mostra o resultado real de cada mês (tudo o que entrou menos o que saiu; o que foi para investimento fica de fora). A parte da renda extraordinária (rescisão, FGTS) aparece em amarelo com ★ e a régua não se deixa levar por ela; toque no mês para ver o que entrou, saiu e foi para investimento.',
    'Na edição de uma entrada: "★ Renda extraordinária (fica fora das médias)". Rescisão, FGTS e indenização já vêm marcadas; marque outra (um prêmio, a venda de algo) ou desmarque.',
    'Apelido: dê um nome fácil a uma loja ou pessoa ("PANIFICADORA …" → "Padaria do bairro"). Vale para todos os lançamentos dessa origem, antigos e novos; o nome do banco continua no detalhe e na busca.',
    '"Quem pagou/recebeu" aparece pelo nome do cadastro de Pessoas, em todas as telas. A busca aceita o nome e o apelido.'
  ]},
  {v:'3.67', d:'2026-11-13', t:'Painel mais claro: período, drill-down, orçamento e projeção', itens:[
    'Painel do BudgetONE: cada bloco diz o período que mostra, e todos usam o mesmo período do filtro. O "por mês" divide pelos meses do período, não mais por 12 fixos.',
    '"Para onde foi": toque no grupo para ver as categorias; toque na categoria para ver os lançamentos dela (ex.: Lazer → Restaurantes → os iFood).',
    'Renda extraordinária (rescisão, FGTS e afins) fica fora das médias e das barras do "Mês a mês"; aparece marcada com ★ e listada à parte.',
    'Orçamento do mês: um limite por categoria, com barra de progresso e aviso aos 80% e ao estourar, na hora em que o lançamento entra.',
    'Projeção do mês: no ritmo de sempre, quanto sobra ou falta até o fim do mês.'
  ]},
  {v:'3.66.1', d:'2026-11-13', t:'Nome e ícone novos', itens:[
    'A aba do navegador e o app instalado se chamam só "MoneyTRIO".',
    'Ícone novo: um cifrão dentro do gráfico de crescimento, que dá para ver na aba (16 px), no tema claro e no escuro, e na tela inicial do celular.'
  ]},
  {v:'3.66', d:'2026-11-12', t:'A família no MoneyTRIO: a parte da casa e a parte só sua', itens:[
    'A família no MoneyTRIO: o chefe pode deixar alguém da família ver só a parte da casa (compromissos, contas da casa, os lançamentos dessa pessoa e os totais da família). O resto fica com outra chave e nem chega ao aparelho dela.',
    'Em Configurações → "Família no MoneyTRIO": marcar quem é da casa, "Preparar a visão da família" (feito uma vez, em segundo plano) e "Liberar" cada pessoa com "Só a casa" ou "Tudo".',
    'Compromissos de PJ (contador, DAS, TFE e afins) ficam sempre só com o chefe, mesmo pagos por outra conta.',
    'Quem vê só a casa usa o BudgetONE, com "Gastos da família" no Painel (com a data da última atualização).'
  ]},
  {v:'3.65.2', d:'2026-11-11', t:'Gráficos que cabem na tela, investimentos e o lançamento mais claro', itens:[
    'Gráficos que cabem na tela: desenhados na largura da tela, com altura que acompanha a janela, números do eixo legíveis nos dois temas ("R$ 150 mil") e a linha do zero sempre à vista. No Fluxo, dois blocos com título próprio ("O que você tem" e "Entrou e saiu, mês a mês") e a linha roxa do saldo do mês. No Painel, "Para onde foi" e "Mês a mês" lado a lado no computador e os meses do ano em colunas.',
    'Aplicação e resgate que o robô manda ("APLICACAO …", "RESGATE …") agora contam como dinheiro que foi para o investimento e que voltou, nunca como renda ou gasto. "Foi para investimento" deixou de mostrar R$ 0,00.',
    '"Patrimônio de hoje" usa os saldos das contas e os investimentos que o robô manda (e a carteira do InvestifyONE, quando houver), sem contar duas vezes.',
    'No lançamento: a Categoria abre a lista inteira do grupo, com a atual marcada; "A confirmar" ganhou "✓ Confirmar como está" dentro da edição (salvar também confirma); o que o robô não soube aparece como "Falta: categoria, banco"; "Por qual banco" já vem com o banco do robô.'
  ]},
  {v:'3.65.1', d:'2026-11-11', t:'Confirmar um boleto vale só para ele', itens:[
    'Confirmar um boleto do Itaú (ou um Pix, TED, DOC ou "compra débito") com a descrição genérica do banco vale só para ele: não muda mais os outros boletos "A confirmar". O Itaú não manda quem recebeu o boleto.'
  ]},
  {v:'3.65', d:'2026-11-11', t:'Cartões, contatos, passeio e barra de andamento', itens:[
    'Cartões por conta: o cartão é a fatura, com vários finais (físico, virtual, adicional). O app encontra os cartões nas suas compras e pergunta uma vez o que não sabe. "Quem usa" define quem pagou.',
    'Contatos e profissionais reconhecidos pelo CNPJ ou pela identificação do banco, mesmo que o nome mude. O nome completo gera os nomes no banco. O código da loja (MCC) vira só um palpite de categoria.',
    'Importar a declaração do IR com escolhas: patrimônio com os bens, restituição prevista, imposto em compromissos e conferência das deduções com o app.',
    'Um passeio de verdade, que mostra cada parte da tela. Uma barra fina abaixo do cabeçalho mostra o andamento de tudo o que está processando. O calendário do menu abre e fecha com animação.',
    'Descrição longa nos lançamentos não passa mais por cima do valor. Parcela ("08/12") vira compromisso até a última. Categorias novas: IA e software, Seguro de vida, IOF / TED / DOC. Salvar cartão voltou a funcionar.',
    'O que o robô só supõe aparece com o selo amarelo "A confirmar" (um toque no ✓ confirma); o que ele não sabe, com o selo vermelho "A identificar". Confirmar ou corrigir um vale para todos da mesma origem, com Desfazer, e a tela "A confirmar" agrupa por origem.',
    'Conferência com o banco em três partes: contas e poupança, cartões (a fatura aberta, com vencimento e limite) e investimentos. Assinatura que você não vai renovar termina na data marcada, e o app avisa se cobrarem depois. "Locação de vídeo" e "CDs/DVDs" viraram "Streaming e mídias", e agora dá para renomear categorias.',
    '"Segurança e aparelhos": uma tela larga (2 a 3 colunas no computador, 1 no celular) com seus dados, PIN e digital, seus aparelhos (com os apps de cada um), o robô do banco e sair. Abre pelo menu do perfil ("☁️ Dados salvos · hh:mm") e por Configurações. O selo "Tudo guardado" virou um ícone discreto no topo.',
    'O PIN é da sua conta SolverONE e vale em todos os apps: quem já usa o OmniLifeONE aprova por um aparelho seu (pode ser o OmniLifeONE no mesmo celular) e usa o mesmo PIN. Pedidos de acesso dizem de qual app vêm.',
    'Cadastrar cartão por foto: em "Cadastrar cartão", "📷 Fotografar cartão" ou "🖼️ Imagem ou print do cartão" (o cartão virtual no app do banco). O app lê a frente neste aparelho, sem internet, preenche final, bandeira, validade e banco, e você confere antes de salvar. A foto não é guardada; só os 4 últimos dígitos ficam. Se o final já aparece nas compras do robô, o cartão fica ligado a elas.'
  ]},
  {v:'3.64.1', d:'2026-11-11', t:'Sair de verdade e criar o PIN da conta', itens:[
    '"Sair" no menu do perfil agora sai da conta de verdade: os dados somem da tela, e nem recarregar nem o "Voltar" do navegador mostram nada até você entrar de novo.',
    'Conta ainda sem PIN da conta: um aviso no topo, "Crie o PIN da sua conta SolverONE", leva a "Criar o PIN da conta" (PIN novo duas vezes, sem pedir o PIN antigo). Ele vale em todos os seus aparelhos e apps, e o PIN antigo deste aparelho deixa de abrir. Abrir com o PIN antigo não cria o PIN da conta sozinho. "Trocar o PIN" só aparece quando a conta já tem PIN.',
    '"🔒 Fechar agora" agora se chama "🔒 Bloquear agora": pede o PIN ou a digital para abrir de novo.'
  ]},
  {v:'3.64', d:'2026-11-11', t:'Pessoas da família, planilha espelho e conferência com o banco', itens:[
    'Pessoas da família (⚙ Configurações): da casa (responsáveis e dependentes), outras pessoas e empresas. Nome, sobrenome, apelido e como o nome aparece no extrato. Mudou o nome, muda em tudo na hora. CPF o app não pede.',
    'Nos lançamentos, "Quem pagou" e "Para quem é" (o beneficiário, que importa na saúde, na escola e no IR). O campo aceita texto livre; nome parecido, mas sem certeza, o app pergunta uma vez.',
    'O que o robô manda com "IRPF" agora chega marcado para o imposto de renda. Estorno vira valor negativo na categoria da compra (não é mais renda). Palpite do robô aparece para você confirmar com um toque.',
    'Planilha espelho: o que você muda aqui vai para o robô e para a planilha dele (fechado, só o robô abre). O link fica no menu do perfil.',
    'No Painel: taxa de poupança, peso de dívidas e parcelas na renda, meses de reserva, o peso de cada grupo na renda e a conferência com o saldo do banco.'
  ]},
  {v:'3.63', d:'2026-11-11', t:'Janela aberta: a tela de trás fica parada', itens:[
    'Com uma janela aberta (detalhe de um lançamento, novo compromisso, explicação ⓘ, "Conferir o que foi lido", as telas da nuvem e o menu ☰ no celular), a roda do mouse ou o dedo rolam só a janela; chegando ao fim, a página de trás não anda mais.',
    'Ao fechar a janela, a lista está exatamente onde você deixou, na mesma linha.'
  ]},
  {v:'3.62', d:'2026-11-11', t:'Um PIN só para a conta', itens:[
    'O PIN agora é da conta, igual em todos os seus aparelhos (como a senha do banco). Trocou num, vale em todos. Num aparelho novo, depois de aprovado pelo outro, é só digitar o PIN que você já tem.',
    'Quem tinha um PIN diferente em cada aparelho: o primeiro aparelho que você destravar define o PIN da conta; nos outros, o app pede uma vez o PIN da conta.',
    'PIN errado 10 vezes: espere 24 h ou aprove por outro aparelho seu ("Esqueci o PIN"). A digital continua valendo em cada aparelho.'
  ]},
  {v:'3.61', d:'2026-11-06', t:'Entrar num aparelho novo sem código de recuperação', itens:[
    'Primeira vez num celular ou computador: em vez do código de recuperação, aprove pelo outro aparelho onde você já entra (os dois mostram os mesmos 6 números; confira e digite o seu PIN) ou peça para alguém responsável da família aprovar.',
    'Nuvem → Aparelhos: a lista dos seus aparelhos, com quem aprovou cada um, e "Tirar" (o aparelho tirado perde o acesso na próxima vez que abrir). Se alguém da família aprovar um aparelho seu, os outros avisam.',
    'O PIN vale só no aparelho em que você criou; se quiser, use o mesmo nos outros. Quem ainda tem o código antigo pode usar pelo link "Tenho o código de recuperação antigo".'
  ]},
  {v:'3.60', d:'2026-11-06', t:'Conferir o que foi lido: direto ao ponto', itens:[
    'No topo, um resumo do que vai acontecer (ex.: "Mensalidades ✓ já cadastrado", "Matrícula ✓ já paga em 30/10"). Só vem aberto o que precisa da sua decisão; o resto fica em "ver detalhes".',
    'Cadastros repetidos aparecem numa faixa só, com o botão "Limpar". Quando já existe um cadastro, "Manter" já vem escolhido; para atualizar ou criar outro, toque em "mudar".'
  ]},
  {v:'3.59', d:'2026-11-06', t:'Boleto certo e a tela de conferir refeita', itens:[
    'Boleto da matrícula: o app lê o valor a pagar e o vencimento do PDF de verdade (antes, nesse PDF, caía no valor do contrato) e acha o pagamento que já está no livro.',
    '"Já existe": só compara o que é do mesmo tipo (mensalidade com mensalidade, período ampliado com período ampliado; lanche, cantina e uniforme nunca). Dois cadastros iguais aparecem juntos ("2 iguais"), com "Apagar o repetido".',
    'A tela "Conferir o que foi lido" ficou mais larga no computador, com as partes lado a lado, títulos claros e os botões Manter · Atualizar este · Criar novo.'
  ]},
  {v:'3.58', d:'2026-11-06', t:'Celular: o selo da nuvem não cobre o calendário', itens:[
    'No celular, com o menu ☰ aberto, o botão "Entrar na nuvem" fica ao lado do menu e não cobre mais o calendário.'
  ]},
  {v:'3.57', d:'2026-11-06', t:'Calendário do menu recolhe', itens:[
    'Calendário do menu (computador e celular): a setinha no cabeçalho recolhe o calendário numa etiqueta com o mês; tocar na etiqueta abre de novo. O app lembra a sua escolha neste aparelho.'
  ]},
  {v:'3.56', d:'2026-11-06', t:'Entrar e PIN sem trocar de campo', itens:[
    'Telas de entrar e do PIN da nuvem: o app não tira mais o cursor do campo em que você está (com o preenchimento automático de senha, o texto podia ir para o campo errado).'
  ]},
  {v:'3.55', d:'2026-11-06', t:'Boleto conferido com a amostra real', itens:[
    'Boleto da matrícula: se o app não conseguir ler o valor a pagar, ele faz a conta (valor do documento menos o desconto) ou avisa "confira o valor", e nunca usa o valor cheio calado.'
  ]},
  {v:'3.54', d:'2026-11-06', t:'Contrato com boleto, sem duplicar, Desfazer e o computador', itens:[
    'Contrato da escola: com o boleto no lote, a 1ª parcela entra com o valor a pagar e o vencimento do boleto, com o nome "Matrícula 2027 (1ª parcela da anuidade)" (dá para trocar). Se o pagamento já está no livro, ou se o compromisso já existe, vem desmarcado e o app mostra qual é; dá para atualizar o que existe ou criar mesmo assim. Depois de Criar, "↩ Desfazer" por 5 minutos.',
    'Vencimentos passados: o app confere sozinho com os lançamentos (mesmo valor ±10%, mesma categoria ou o nome, até 7 dias) e marca como pagos. O que venceu antes de você cadastrar o compromisso e não bateu fica "sem conferência", e não mais "atrasado".',
    'Compromisso repetido: o app pergunta na hora, antes de criar ("Parece que já existe…": Atualizar o existente, Criar mesmo assim ou Cancelar). Nomes com números diferentes (Seguro 1 × Seguro 2) ou valores e categorias diferentes não contam mais como repetidos. No computador, a coluna de ações das tabelas não fica mais cortada.',
    'No computador: o menu fica colado à esquerda, vai até o fim da tela e rola com a roda do mouse ou com dois dedos; o calendário aparece sempre inteiro; o conteúdo usa a largura toda e se ajusta ao trocar de tela ou de tamanho de janela.'
  ]},
  {v:'3.53', d:'2026-11-06', t:'Correção no contrato do período ampliado', itens:[
    'Contrato do período ampliado: o nome da 1ª opção não leva mais o fim do cabeçalho da tabela ("Anuidade Parcelas Parcela").'
  ]},
  {v:'3.52', d:'2026-11-06', t:'Tabela do contrato lida certo', itens:[
    'Contrato da escola: a tabela de preços agora é lida no formato exato do PDF real. Cada opção sai com o nome certo (ex.: "Ens. Fundamental (1º ao 5º ano)", "Período Ampliado (3x na semana)", "Horário Estendido (5x na semana)"), com o horário à parte. Os exemplos das telas usam nomes genéricos.'
  ]},
  {v:'3.51', d:'2026-11-06', t:'Arrumação interna', itens:[
    'Arrumação interna, nada muda para você: o glossário e as aulas do Coach foram para arquivos próprios.'
  ]},
  {v:'3.50', d:'2026-11-06', t:'Ligação com o OmniLifeONE (saúde)', itens:[
    'Ligação com o OmniLifeONE: quando o OmniLifeONE mandar o resumo da saúde da família (fechado, só chefe e responsável abrem), o plano de saúde ganha a operadora e quem ele cobre, e o médico de referência vira profissional conhecido: o PIX para ele já entra como Saúde, da pessoa certa, com IR.'
  ]},
  {v:'3.49', d:'2026-11-06', t:'Contrato da escola lido certo', itens:[
    'Contrato da escola: o app agora lê certo o texto real do contrato. Cada opção fica com o nome dela (ex.: Fundamental 1º ao 5º × 6º ao 9º; período ampliado 5x × 3x), o aluno vem da parte do aluno (nunca do pai ou da mãe), o dia de vencimento é lido e só aparecem as linhas da etapa marcada, já com a série certa escolhida.'
  ]},
  {v:'3.48', d:'2026-11-06', t:'Arrumação interna', itens:[
    'Arrumação interna, nada muda para você: os textos do app (as novidades e o inglês) e o visual foram para arquivos próprios, para o app crescer sem bagunça.'
  ]},
  {v:'3.47', d:'2026-11-06', t:'Contrato da escola pelo modelo e extrato do FGTS', itens:[
    '"📄 Compromisso de um contrato (PDF)" agora reconhece o contrato escolar, o do período ampliado e o boleto da matrícula (pode escolher os três de uma vez): mostra uma prévia e cria os compromissos "a confirmar", com os meses certos (ex.: sem julho) e o IR, e lança a 1ª parcela como gasto pontual. Se o contrato não marcou a opção, o app pergunta.',
    'Sem liquidez → "📄 Ler extrato do FGTS (PDF)": lê o extrato de cada conta (empregador, admissão, afastamento, saldo e lançamentos) e atualiza a conta certa depois da sua confirmação. Entre um extrato e outro, o saldo é estimado pelo JAM ("estimado desde …"); em agosto o app lembra de atualizar; conta zerada fica guardada e escondida.'
  ]},
  {v:'3.46', d:'2026-11-06', t:'Assinaturas, compromisso de um contrato, época do ano e boleto', itens:[
    'Assinaturas: plano mensal ou anual, data de renovação, aviso antes de renovar (7 dias no mensal, 30 no anual) e a comparação "anual × mensal" quando há os dois preços.',
    '"📌 Virar compromisso" no lançamento e "📄 Compromisso de um contrato (PDF)" em Custos: o app lê o contrato da escola sem IA (escola, aluno, ano, parcelas, valor, vencimento) e abre o formulário preenchido para você conferir.',
    'Valor que varia: com 12 meses de histórico, "usar a época do ano" (ex.: luz mais cara em janeiro). "🧾 Chegou um boleto (PDF)": o app lê valor e vencimento (também pela linha digitável) e o boleto vira o previsto daquele mês; o pagamento de verdade ainda ganha.'
  ]},
  {v:'3.45', d:'2026-11-06', t:'Patrimônio sem liquidez e Importar posições', itens:[
    'InvestifyONE: patrimônio sem liquidez (FGTS, previdência bloqueada, imóvel…) com a etiqueta "🔒 sem liquidez — não dá para sacar". Entra no Patrimônio total do Painel, mostrado separado do líquido, e fica fora da alocação e da rentabilidade.',
    'Carteira → "Importar posições (JSON)": prévia em tabela; o que já existe e as linhas com problema vêm desmarcados; nada é trocado nem apagado.'
  ]},
  {v:'3.44', d:'2026-11-06', t:'Plano de saúde: reembolso estimado e o que fica para o IR', itens:[
    'Nova tela "Plano de saúde" (BudgetONE): operadora, PF ou PJ, quem o plano cobre, coparticipação, reembolso e a tabela de reembolso por tipo (consulta, exame, terapia, dentista) e por especialidade.',
    'Cada gasto de Saúde mostra "↩ volta ~R$ X · IR R$ Y (estimado)"; TaxONE → Deduções mostra o total do ano: gasto, quanto volta e quanto fica para o IR.',
    '"Ler a apólice (PDF)": o app acha a operadora, se há reembolso e coparticipação e os valores da tabela, sem IA; você confere e salva. A apólice fica guardada fechada.'
  ]},
  {v:'3.43', d:'2026-11-06', t:'Profissionais conhecidos', itens:[
    'Em Custos → Revisar, "Profissionais para confirmar": o app junta os lançamentos de cada médico, dentista ou escola pelo nome (mesmo com PIX, DRA., LTDA ou uma letra diferente) e pergunta uma vez só. Confirmado, todo lançamento com esse nome, antigo e novo, já entra com a categoria, a pessoa e o IR certos.',
    'Nome meio parecido com um conhecido aparece com a sugestão ("parece Dra. …"), e só é classificado depois de confirmar. "Não é profissional" para de perguntar. Lançamento que você editou à mão nunca é mexido.'
  ]},
  {v:'3.42', d:'2026-11-06', t:'Agendamentos que vencem, nota fiscal pendente e Pasta do IR', itens:[
    'Compromisso "Agendado no banco" ganha "o agendamento vale até". Um mês antes, Custos e a fita avisam "Renovar o agendamento"; o botão "Renovei" empurra a data 12 meses (ou o ciclo escolhido).',
    'Todo gasto que entra no imposto de renda nasce com "🧾 NF aguardando". Um toque em "Recebi" dá baixa; a tela "NFs que faltam" mostra o que cobrar de cada profissional.',
    'Subir NFs em PDF: o app lê o PDF (sem IA), liga cada nota ao gasto pelo valor, data e nome, e guarda na Pasta do IR do ano com o nome "AAAA-MM-DD Categoria Pessoa.pdf". Informes de rendimentos e outros papéis vão para a mesma pasta (TaxONE → Deduções → Pasta do IR).',
    'Os arquivos ficam guardados fechados: no aparelho e, depois da atualização do banco de dados, também na nuvem.'
  ]},
  {v:'3.41', d:'2026-11-06', t:'Base para as funções novas (módulos)', itens:[
    'Por dentro: as funções novas passam a vir em arquivos separados (módulos), cada uma com o próprio teste. O app fica mais fácil de manter e não muda nada na tela.'
  ]},
  {v:'3.40', d:'2026-11-03', t:'Caixa do robô com muitos itens de uma vez', itens:[
    'Quando o robô reenvia muitos lançamentos de uma vez (milhares), o app junta as transferências uma vez por lote, sem travar a tela.'
  ]},
  {v:'3.39', d:'2026-11-03', t:'Renda: conta de passagem, Rescisão e FGTS, e a correção do robô', itens:[
    'Transferências entre contas que chegam do robô não somem mais: ficam em cinza em Lançamentos e não contam como renda nem como gasto. Salário que cai numa conta e passa para outra (ex.: BTG → Itaú) mostra "passou para outra conta"; ida e volta (PJ ↔ PF) vira uma linha só.',
    'Renda ganhou as categorias Rescisão e FGTS (separado); o que vem do robô com "rescisão" ou "FGTS" já entra na categoria certa.',
    'Quando o robô corrige um lançamento que já chegou, o app atualiza. Se você já tinha editado esse lançamento, a sua versão fica e aparece "🤖 O robô sugeriu outra coisa", com [Usar o do robô] e [Manter o meu]. (Precisa da atualização do banco de dados, que o administrador aplica.)'
  ]},
  {v:'3.38', d:'2026-11-03', t:'Valor que varia, pontos e cashback, feriados de SP e o IR pela data do pagamento', itens:[
    'Compromisso com valor que varia (condomínio, luz): marque "O valor varia" e o app mostra a média dos últimos 6 meses e a faixa, para usar como previsto (com ou sem a inflação do grupo). Quando o pagamento de verdade chega, ele substitui o previsto daquele mês e a diferença aparece.',
    'Abatimento em lançamentos e compromissos: "+ Abatimento" para a parte paga com pontos, cashback, crédito ou desconto. O orçamento conta o que saiu de verdade; na lista o valor ganha um * que explica o preço cheio. Custos mostra quanto você economizou no ano.',
    'Feriados do estado e da cidade: em Configurações → BudgetONE → Feriados, escolha o estado e a cidade (já vem SP / São Paulo: 25/01 e 09/07) ou acrescente os seus. Eles mudam o dia de pagar e tiram o dia da diarista.',
    'Nos dias trabalhados do serviço por visita, "✕ não veio" com um toque.',
    'TaxONE, Deduções: aviso de que o imposto conta pela data do PAGAMENTO (a matrícula do ano que vem paga agora entra na declaração do ano que vem, ano-base deste ano).',
    'No computador, as telas de tabela (Carteira, Movimentações, Lançamentos, Custos e TaxONE) usam mais largura, e o cabeçalho das tabelas que cabem inteiras fica fixo ao rolar, também nas janelas.'
  ]},
  {v:'3.37', d:'2026-11-03', t:'"Novo compromisso" mais simples e campo de data que aceita digitar', itens:[
    'Novo compromisso: na frente só O quê, Valor e Dia; o resto fica em "Mais opções". Enquanto você digita o nome, o app sugere grupo, categoria, pessoa, IR, dia e valor pelo seu histórico (sem IA), e um toque aceita.',
    '"Para quem é" (com "Casa (família toda)") e "Quem paga" separados; "Como paga" com opções claras: Eu pago, Débito automático, Agendado no banco.',
    'Fileira de 12 meses para tirar os meses sem cobrança (ex.: julho), "Salvar e copiar", e o formulário não fecha mais ao tocar fora; se fechar sem salvar, ao abrir de novo aparece "Continuar de onde parou".',
    'Ao salvar, o app avisa quando parece repetido (mesmo nome ou categoria, mesma pessoa, período que se cruza), inclusive assinatura duplicada; a lista marca "⚠ repetido?".',
    'Clonar e "Rolar para o próximo ano": cria o do ano que vem com as datas 1 ano à frente e o valor provisório pela inflação do grupo, marcado "a confirmar".',
    'Campos "Conta de acesso", "Cartão ou forma de pagamento" e "Observação", com o aviso de não escrever senha.',
    'Campo de data em todo o app: dá para digitar 30/12/2027, 30/12/27, 3012 ou 30122027; no calendário, toque no mês para pular direto para outro mês e ano; atalhos Hoje, Fim do mês, Fim do ano e Ano que vem inteiro.'
  ]},
  {v:'3.36', d:'2026-11-03', t:'Custos: a aba "Todos", a lista do que se repete e a conta do mês certa', itens:[
    'Custos ganhou a aba "Todos" (o que se repete e o que foi pontual, juntos) e uma linha explicando o que é cada aba.',
    'No lugar dos botõezinhos "O histórico sugere", a lista "Encontrei N que se repetem", com caixinhas já marcadas e o botão "Cadastrar os marcados". Usa o histórico e a frequência que o robô dos bancos manda, separa renda de custo, não mostra o que parou há 2 meses ou mais e marca "já existe" o que já está em Recorrentes.',
    '"Sai todo mês" e "Entra todo mês" contam só os compromissos que valem neste mês: um que começa em 2027 não pesa em 2026.',
    'Em Recorrentes, "Quando cai" mostra o período inteiro na segunda linha: "01/Fev a 30/Jun/2027", "desde 01/Fev/2027" ou "até 31/Dez/2027".'
  ]},
  {v:'3.35', d:'2026-11-03', t:'Recarregar sem pedir o PIN e telas largas no computador', itens:[
    'Recarregar a página (ou abrir de novo) dentro de 15 minutos de uso não pede o PIN nem a digital de novo. Passou disso, ou se você fechar o cadeado, pede. A tela do cadeado avisa: "Você continua conectado… Só falta destravar."',
    'No computador, a prévia de "Importar compromissos" usa a largura da tela e mostra todas as colunas; o cabeçalho das tabelas (prévia, Lançamentos e Recorrentes) fica fixo ao rolar. No celular, tudo igual.'
  ]},
  {v:'3.34', d:'2026-11-03', t:'Seguro do carro numa categoria só', itens:[
    'Seguro do carro numa categoria só: Veículo · Seguro Auto.'
  ]},
  {v:'3.33', d:'2026-11-03', t:'Importar compromissos', itens:[
    'Importar compromissos de um arquivo: o app mostra a prévia, avisa o que já existe e importa só o que você marcar.'
  ]},
  {v:'3.32', d:'2026-11-03', t:'Seu nome no topo', itens:[
    'Seu nome aparece no topo no lugar de \'Dono da carteira\'.'
  ]},
  {v:'3.31', d:'2026-11-03', t:'Cadeado mais tranquilo', itens:[
    'Cadeado mais tranquilo: tranca depois de 15 minutos sem uso ou 10 minutos fora do app, avisa 1 minuto antes e, ao destravar, você volta para onde estava sem perder o que digitou.',
    'Nunca tranca no meio de um trabalho (importação, envio para a nuvem, lançamentos chegando do banco): espera terminar e conta o tempo de novo. A tela do cadeado diz por que trancou e a hora.'
  ]},
  {v:'3.30', d:'2026-11-03', t:'MoneyTRIO na nuvem', itens:[
    'MoneyTRIO na nuvem: entrar com a conta SolverONE (Google ou e-mail), cadeado da família (código de recuperação na primeira vez, depois PIN ou digital), dados guardados fechados na nuvem e lançamentos dos bancos chegando sozinhos.',
    'Quem não quer conta continua usando só neste aparelho: na tela de entrada, "Usar o MoneyTRIO só neste aparelho". Para passar para a nuvem depois, o botão ☁️ no canto da tela; o app oferece levar os dados deste aparelho (com cópia de segurança antes).',
    'Caixa do robô (botão ☁️): antes de autorizar, o app confirma que o robô só entrega lançamentos e não consegue ler nada do que está guardado; depois mostra uma mensagem fixa com a data e o próximo passo.',
    'Lista dos robôs autorizados, com a data e o botão "Remover acesso" (com confirmação). Se o e-mail já está autorizado, o app avisa e não muda nada; os erros ficam em vermelho no painel, sem apagar o que foi digitado.',
    'O PIN não é mais tratado como senha pelo navegador, e logo depois de criar o PIN o app oferece abrir com a digital.'
  ]},
  {v:'3.29', d:'2026-11-03', t:'Ajuda mais curta, sem obviedades', itens:[
    'Textos de ajuda mais curtos: a ajuda de cada tela e o balão do AssistONE deixaram de explicar o óbvio ("toque para entrar", "toque na linha para editar") e ficaram só com o que ajuda de verdade. O balão mostra "📍" e o nome da tela, sem o "Você está em".'
  ]},
  {v:'3.28', d:'2026-11-03', t:'Carteira tirada do site e tela de entrada que rola', itens:[
    'Tirada do site a carteira que vinha guardada dentro dele. A senha dela tinha ficado escrita num documento público do projeto, e quem a encontrasse conseguia abrir. Agora cada pessoa começa do zero no próprio aparelho; a seguir os dados vão para a nuvem, trancados com a conta SolverONE.',
    'A tela de entrada rola quando não cabe na tela (notebook com tela baixa): antes, a parte de baixo ficava escondida e não dava para chegar nela.'
  ]},
  {v:'3.27', d:'2026-10-10', t:'Obedece aos interruptores do RootifyONE', itens:[
    'O dono liga e desliga recursos de todos os apps no RootifyONE (Controle dos apps), e o MoneyTRIO agora obedece: o AssistONE (o personagem e o balão), as dicas de cada tela no balão, os anúncios (a faixa e o pop-up), a IA (o botão ✨ IA, a leitura de foto pela IA e a janela de perguntas) e a voz (ouvir e ditar). Desligado lá, some aqui; em ⚙ Configurações o AssistONE mostra "Desligado pela administração da SolverONE."',
    'A moeda base de quem começa do zero também vem de lá (BRL, USD ou EUR). Quem já escolheu a moeda ou já lançou alguma coisa continua com a sua.',
    'Sem internet, vale a última escolha recebida; sem nenhuma, tudo fica como sempre foi. Nenhum dado seu é enviado: o app só lê dois arquivos públicos.'
  ]},
  {v:'3.26', d:'2026-10-09', t:'Leitura de foto que não morre ao sair da tela', itens:[
    'Enquanto o app lê uma foto, a tela do celular não apaga (Wake Lock) e o navegador pergunta antes de fechar ou recarregar a página. A janela diz: pode ir para outra tela, a leitura continua.',
    'Uma pílula fixa no canto ("⏳ Lendo comprovante… 40%") acompanha você pelo app; quando termina, vira "✓ Comprovante lido — toque para ver" e traz de volta a tela com o resultado. Fechar a janela no meio não cancela nada.',
    'Isso é um módulo só (Fundo), pensado para virar diretriz de todos os apps e, no app nativo, o serviço que segura o processo.'
  ]},
  {v:'3.25', d:'2026-10-09', t:'Ler comprovante: mais rápido, foto torta e nome da loja pelo CNPJ (ou pela IA)', itens:[
    'Mais rápido: a foto de celular (12 MP) é recortada no papel e reduzida antes de ler; leitura que levava minutos no celular cai para segundos. Foto torta (até 45°) vai direto para o motor que endireita, sem gastar tempo lendo o quadro torto.',
    'Consertado: o endireitamento girava para o lado errado (um comprovante a 21° saía a 42°). Agora o comprovante inclinado da maquininha sai com valor confirmado, data, CNPJ e bandeira.',
    'Nome da loja pelo CNPJ: quando o CNPJ lido confere, o app busca o nome oficial na Receita Federal (BrasilAPI) e troca o nome mal lido pelo OCR. Só os 14 números saem do aparelho; dá para desligar na tela de escanear.',
    'Ler com a IA: quem tem chave de IA (Gemini, OpenAI ou Claude) pode ligar "🤖 Ler com a IA" na tela de escanear — a foto vai para a IA, que lê papel amassado e torto muito melhor; e em qualquer cartão lido no aparelho há o botão "Tentar com a IA". A foto só sai do aparelho com a chavinha ligada ou ao tocar nesse botão.'
  ]},
  {v:'3.24', d:'2026-10-09', t:'BudgetONE vazio: cada aba com o seu começo, e a foto como primeira entrada', itens:[
    'Consertado: sem nenhum gasto, as seis abas do BudgetONE (Painel, Lançamentos, Custos, Fluxo, Renda, Futuro) mostravam a mesma tela, e parecia que o app tinha travado ao tocar embaixo ou no ☰. Agora cada aba tem o seu título e o seu convite: Custos chama o primeiro compromisso, Renda chama o salário, e as outras chamam o primeiro lançamento.',
    'A foto do comprovante é a primeira forma de começar: 📷 Ler comprovante aparece em primeiro em todas as telas vazias, antes de "Começar pelo básico", "Importar arquivo" e "Novo lançamento".'
  ]},
  {v:'3.23', d:'2026-10-09', t:'Ler comprovante por foto, com o motor do Leitor OCR', itens:[
    'Tire uma foto (ou escolha fotos e PDF) de um comprovante de maquininha, cupom, nota fiscal, conta de restaurante ou boleto: o app endireita a foto, acha o papel, lê o texto várias vezes e só afirma o valor quando duas leituras concordam — senão mostra os valores possíveis para você tocar no certo. Lê também o QR da nota e o código de barras do boleto em qualquer celular, sem depender do leitor do navegador.',
    'É um motor só, o do app Leitor OCR, já testado com dezenas de comprovantes: o BudgetONE chama em Escanear, o InvestifyONE em "Ler comprovante" (Carteira e Movimentações), e o TaxONE usa o mesmo motor nos Documentos do IR. O AssistONE tem o atalho em cada tela.',
    'Vários papéis numa foto só (a nota e o comprovante do cartão lado a lado): o app pergunta se lê separado e avisa quando dois papéis são a mesma compra.',
    'O leitor de texto agora vem junto com o app (assets/ocr) e fica guardado no aparelho: depois da primeira leitura funciona sem internet.'
  ]},
  {v:'3.22', d:'2026-10-02', t:'AssistONE com o personagem e topo padronizado', itens:[
    'O AssistONE ganhou o personagem oficial (o mesmo de todos os apps): botão redondo no canto de baixo, fundo escuro também no tema claro, anel dourado e um balanço leve, que para quando o balão abre ou quando o aparelho pede menos movimento.',
    'Topo padronizado: ☰ na ponta esquerda (no computador recolhe e abre o menu da esquerda), o nome do app aberto com ▾ abre o seletor com Início (o MoneyTRIO com os três) e os outros apps; à direita, 🔍 busca, 📥 mensagens (contas a vencer, atrasadas e entradas do dia, com contador) e 👤 perfil.',
    'O 👤 mostra quem está conectado (nome, e-mail, papel, desde quando) e reúne Configurações, Tema, Atualizar cotações, Ajuda, IA e Sair. O 🏠, o 🌙 e o PT|EN saíram do topo: o idioma fica em Configurações → Idioma e formatos.',
    'Acessibilidade: tamanho da letra (normal, grande, maior) e "Reduzir animações" em Configurações → Preferências; o foco por teclado nunca fica escondido atrás do topo; o contador de mensagens é anunciado ao leitor de tela.',
    'Consertado: quem entrava sem a senha da carteira ("Entrar sem abrir a carteira") era tratado como dono; agora é visitante, como o botão diz.'
  ]},
  {v:'3.21', d:'2026-09-26', t:'Outras rendas, com dia e banco', itens:[
    'Renda ganhou "+ Nova renda": aluguel recebido, pró-labore, freelance/PJ, aposentadoria ou pensão do INSS, pensão alimentícia, dividendos, restituição do IR, bônus/13º, venda de um bem ou qualquer outra. Diz de quem vem, quem recebe, o valor, quando cai (dia fixo, dia útil, último dia, último dia útil, toda semana, uma vez por ano ou só uma vez) e em qual banco. Entra na agenda, no calendário e no caixa; a lista fica num cartão próprio, com edição e exclusão.',
    'Banco em qualquer lugar: o seletor mostra os seus bancos primeiro e, embaixo, a lista inteira — escolher um da lista já cadastra, sem ir às Configurações.',
    'No lançamento, ao marcar Mensal (ou semanal, trimestral, anual), aparece o atalho "Cadastrar como renda fixa" ou "Cadastrar como compromisso", já com o valor, o dia e a categoria preenchidos.',
    'Consertado: a pergunta "Isto parece conta fixa" ficava por cima do formulário e travava a tela; agora fecha ao clicar em Cadastrar, e não aparece por cima de outra janela. Quando a conta é de renda, abre o formulário de renda.'
  ]},
  {v:'3.20', d:'2026-09-26', t:'Correção: vários benefícios', itens:[
    'Consertado: só dava para cadastrar um benefício (o segundo substituía o primeiro) e não dava para editar nem excluir. O mesmo defeito valia para lugares e trajetos. Registros já salvos assim ganham identificação sozinhos ao abrir o app.'
  ]},
  {v:'3.19', d:'2026-09-26', t:'Benefícios, deslocamentos e filtros', itens:[
    'Benefícios pendurados no salário: vale-alimentação, vale-refeição, vale-transporte, plano de saúde, odontológico, creche, educação, home office, academia, seguro de vida, previdência, PLR e qualquer outro. Cada um é obrigatoriamente ligado a um salário: se o emprego acaba, o benefício acaba junto. Três modos: entra como dinheiro (cai no caixa como o salário, no último dia útil, no 5º dia útil, num dia fixo ou junto com o salário), só referência (economia estimada: VT, estacionamento, plano) ou desconta no salário (informativo). Aparecem dentro do cadastro do salário e num cartão próprio em Renda, com a foto do extrato do vale preenchendo operadora e valor.',
    'Deslocamentos (BudgetONE → Deslocamentos, atrás da flag "deslocamentos"): lugares com endereço e coordenadas pelo OpenStreetMap, trajetos com jeito de ir, quem vai e quantas vezes, distância de carro estimada (e editável), pedágio, abastecimentos por viagem longa, app/táxi e transporte público (coberto pelo vale-transporte quando há). Duas pessoas no mesmo carro contam uma vez ("vai junto com", inclusive a partir de uma data). A estimativa pode virar custo fixo.',
    'Os cartões do Painel do BudgetONE são clicáveis: Entrou leva a Renda, Saiu a Lançamentos, Sobrou a Fluxo e Custo de viver a Custos. Os cartões do salário levam a Renda.',
    'O filtro de período começa em "Últimos 12 meses" e o app lembra o que você deixou, neste aparelho. No celular, os períodos viraram um seletor só, ao lado de "mais filtros".',
    'O seletor de nível (Iniciante/Médio/Expert) só aparece onde muda alguma coisa: no BudgetONE as explicações têm um texto só, então ele some ali.',
    'Compromisso que cai no último dia útil do mês.'
  ]},
  {v:'3.18', d:'2026-09-26', t:'Tabelas que cabem no celular', itens:[
    'No celular, tabela que não cabe na tela vira uma lista de cartões, sem rolar para o lado e sem fonte menor: a primeira coluna à esquerda, o valor principal em destaque à direita e o resto em uma linha abaixo, cada um com o seu rótulo. Vale para "As dez maiores contas" no início do BudgetONE, para os Lançamentos, para o ano a ano do Fluxo e para qualquer tabela que estourar.',
    'Tocar na linha continua abrindo o lançamento. Ao girar o celular, a tela se refaz sozinha.'
  ]},
  {v:'3.17', d:'2026-09-26', t:'Leitura de comprovante de maquininha', itens:[
    'O leitor de cupom por foto passa a entender o comprovante da maquininha (Cielo, Rede/laranjinha, Getnet, Stone, iFood Pago, PagSeguro…): valor na linha do CRÉDITO/DÉBITO ou sozinho com R$, data (a que vem com a hora), loja (a linha com LTDA perto do CNPJ), CNPJ que confere pelo dígito (o AID não é confundido com CNPJ), crédito ou débito, bandeira e final do cartão.',
    'A bandeira certa é a que está colada no final do cartão ("MASTERCARD ****9458"); VISA e ELO impressos no fundo do papel não enganam mais. "Pix" e "à vista" impressos no papel também não viram forma de pagamento quando o comprovante é de cartão.',
    'O banco impresso na maquininha (laranjinha = Itaú da loja) não é mais tomado como banco de quem pagou.'
  ]},
  {v:'3.16', d:'2026-09-26', t:'Visual mais limpo e o AssistONE', itens:[
    'AssistONE: o personagem redondo no canto de baixo da tela, em todas as telas. Ao tocar, ele cresce e abre um balão que começa por "Você está em…", com uma frase da tela e atalhos que já executam a ação (novo lançamento, escanear, importar, novo investimento…), e depois oferece Começar, Tour rápido, Procurar algo e Ajuda desta tela. Na primeira visita ele se apresenta. Liga e desliga em ⚙ → Compartilhadas → Preferências.',
    'Visual mais suave: cantos mais arredondados, menos bordas e menos peso nos cartões, botões e janelas; tudo que abre, abre com um movimento curto.',
    'Celular: o topo ficou só com ícones (☰, nome do app, ⟳, 🔍, 🏠); o tema fica em Configurações e a ajuda é o AssistONE. As janelas sobem de baixo como uma folha; a barra de baixo ganhou um destaque suave na aba atual.',
    'Menos texto: os avisos legais do rodapé ficam recolhidos em "Avisos legais e privacidade"; no celular, as explicações longas dobram mais cedo e os cartões do início mostram só a frase principal.',
    'Botão 🏠 Início no topo, em todos os apps: volta para a tela de escolha do MoneyTRIO.',
    'Ajuda das telas do TaxONE (painel, imposto, PJ × CLT, declarações, processos, documentos, deduções).'
  ]},
  {v:'3.15', d:'2026-09-26', t:'IA: troca sozinha e teste da chave', itens:[
    'Se a IA escolhida falhar por falta de cota, de crédito ou chave recusada, o app espera uns 3 segundos e usa a próxima IA que tem chave salva, na ordem da lista, avisando na tela: "🔁 <IA> está sem cota agora — usando <outra>". A sua escolha continua salva.',
    'O cofre mostra no topo quais IAs já têm chave salva; na lista, elas vêm primeiro, com o selo "✓ chave salva" ou "sem chave".',
    'Ao colar a chave, o app testa no provedor antes de guardar. Chave recusada não é salva; "falta permissão" e "sem cota" contam como chave válida e são aceitas.'
  ]},
  {v:'3.14', d:'2026-09-25', t:'Documentos do IR: ler, juntar e conferir', itens:[
    'Nova tela TaxONE → Documentos do IR: escolha de uma vez todos os papéis do ano (PDF ou foto) e o app lê cada um: informe de rendimentos da empresa, do banco e da corretora, extrato de reembolso do plano de saúde, nota fiscal e recibo de médico e dentista, recibo do Receita Saúde, holerite e pró-labore, financiamento, consórcio, sociedade em conta de participação, conta e corretora no exterior (statement, 1042-S, relatório auxiliar).',
    'Junta os repetidos: a nota fiscal e o comprovante do Pix ou do cartão do mesmo pagamento viram uma despesa só; o extrato do plano completa com o reembolso, e o dedutível já sai líquido.',
    'Conferência com a declaração do ano: rendimentos por fonte, isentos, saúde por profissional e saldos dos bens — o que bate, o que está diferente, o que tem documento e não foi declarado, e o que foi declarado sem documento.',
    'Saúde por pessoa, com "quem é quem" (o nome de registro do documento ligado ao nome usado no app), e botão para levar consultas, exames e holerites ao BudgetONE sem duplicar.',
    'PDF escaneado ou que é só imagem: o app desenha a página e lê pelo OCR. Foto de recibo: clareia e aumenta antes de ler. Recibo escrito à mão: a parte impressa (profissional, registro) vem pronta e o valor e a data ficam marcados para você conferir.',
    'PDF com senha (bancos que usam os primeiros dígitos do CPF): o app pede a senha só para abrir, na hora, e não guarda. Agora abre também a criptografia AES-256.',
    'Leitor de PDF bem mais preciso: cada fonte com o seu mapa de letras (acabou a troca de letras entre fontes e os acentos sumindo no informe da Caixa e do Itaú), palavras partidas pelo kerning voltam a ser uma só ("1 1.968,84" virou 11.968,84), texto "espaçado" (S a l d o) volta a ser palavra, páginas viradas saem na ordem certa, e o texto marcado por cima do desenho (ActualText) passa a valer.',
    'Declaração: agora o app lê também os Bens e Direitos item a item (com os valores de 31/12 dos dois anos), as Dívidas e os rendimentos isentos e exclusivos por fonte. Conferido com as declarações de 2024, 2025 e 2026: a soma dos itens bate com o total ao centavo.',
    'Patrimônio declarado no IR: tabela ano a ano por grupo (imóveis, veículos, ações, aplicações, contas, fundos, outros), com a variação — no InvestifyONE e em Declarações. E os isentos e exclusivos da declaração (dividendos, 13º, aplicações) podem ir para o BudgetONE junto com o salário.',
    'Privacidade: nenhum CPF por extenso é guardado (nem o seu, nem o dos profissionais), conta e cartão só pelo final, e o texto dos documentos não fica no app — só os números que importam.'
  ]},
  {v:'3.13', d:'2026-09-25', t:'O TRIO em vinho', itens:[
    'O TRIO do nome MoneyTRIO agora é vinho em todo lugar onde o nome aparece: menu inicial, rodapé de dentro dos apps, menu de troca de app, tela de senha, boas-vindas do passeio, texto de instalar e, se algum anúncio citar o MoneyTRIO, no carrossel também.',
    'No tema claro é o tom exato; no escuro, o mesmo vinho um pouco mais aceso, porque o original quase some no fundo escuro.',
    'O ONE de cada app continua com a cor do app (azul, verde e laranja).'
  ]},
  {v:'3.12', d:'2026-09-25', t:'Malha fina e e-Processo', itens:[
    'Processos do e-Processo: abra a lista e o histórico no e-Processo, selecione tudo, copie e cole em TaxONE → Restituição e processos → "Colar do e-Processo". O app lê número, data do protocolo, tipo, subtipo, local e cada movimentação (atividade, equipe, data de entrada, dias parados e a média da Receita).',
    'Cada processo de malha fica ligado à declaração de que trata — o app sugere a mais recente entregue antes do protocolo, e você confere — e a restituição daquela declaração passa a aparecer como "retida na malha".',
    'Prazo legal: o cartão do processo conta os dias desde o protocolo contra os 360 dias do art. 24 da Lei 11.457/2007 e fica vermelho quando passa. O "i" explica o prazo, o que o STJ decidiu e os caminhos (com a ressalva de que não é aconselhamento jurídico).',
    'Restituição corrigida pela Selic: o app busca a Selic mensal no Banco Central e mostra quanto a restituição retida vale hoje (soma da Selic desde junho do ano da entrega, mais 1%).',
    'PDFs do processo (termos, despachos) entram no acompanhamento: o app lê o título, a data e o resultado — por exemplo "7 documentos enviados · 7 aceitos · nenhum rejeitado".',
    'O leitor de PDF passou a abrir PDFs criptografados sem senha (RC4 e AES-128), como os documentos do e-Processo.',
    'Declaração de 2024 (retificadora) testada: lida por inteiro, como as de 2025 e 2026.',
    'Privacidade: CPF escrito sem pontos no meio de uma descrição ("CPF:12345678901") também sai mascarado, e toda declaração e todo texto do e-Processo passam por essa limpeza antes de serem guardados.',
    'Consertado: salvar um acompanhamento sem mudar o estado apagava o histórico dele.'
  ]},
  {v:'3.11', d:'2026-09-25', t:'Declaração de verdade', itens:[
    'A leitura da declaração foi calibrada com declarações reais (2025 retificadora e 2026 original): todos os números do resumo batem, centavo por centavo, com o arquivo da Receita.',
    'O PDF da Receita escreve primeiro todos os rótulos de um bloco e depois todos os valores. O leitor agora monta as linhas pela posição na página — rótulo e valor juntos, como aparecem impressos.',
    'Importe a declaração e o recibo de entrega de uma vez (escolha os dois arquivos): da declaração vêm os números, do recibo vem o número do recibo desta declaração. O número que aparece dentro da declaração é o do ano anterior — e o app não confunde mais os dois.',
    'O app passa a ler também: rendimentos de pessoa jurídica e de pessoa física/exterior, carnê-leão, dedução de dependentes, alíquota efetiva, 13º, rendimentos isentos e de tributação exclusiva, bens e direitos no começo e no fim do ano, data de entrega, e se é retificadora.',
    'Fontes pagadoras com nome completo (mesmo quebrado em duas linhas) e CNPJ; pagamentos com a descrição que você escreveu e para quem foi (titular ou cada dependente). CPF de profissional, até dentro da descrição, fica mascarado.',
    'Levar para o BudgetONE: o mesmo beneficiário (o plano de saúde de cada pessoa da família) vira um lançamento só por ano, dizendo quantos pagamentos junta.',
    'O número do recibo é "de uso pessoal", diz a Receita: na lista aparece só o final; inteiro, só dentro da declaração.'
  ]},
  {v:'3.10', d:'2026-09-25', t:'TaxONE no ar, e o salário nos três apps', itens:[
    'TaxONE aberto: Painel, Imposto do ano, PJ × CLT, Declarações, Restituição e processos, e Deduções.',
    'Imposto do ano: a previsão do ajuste de 2027 — rendimento tributável, IR retido, completa × simplificada (o app escolhe a que dá menos imposto) e o resultado: a pagar ou a restituir. Já com a regra nova de 2026: até R$ 60 mil no ano o imposto zera, e até R$ 88,2 mil ele diminui.',
    'Imposto de renda é por pessoa: o TaxONE pergunta "Declaração de:" e faz a conta de cada um separado.',
    'Declarações: importe o PDF da declaração entregue. O app lê o resumo, as fontes pagadoras e os pagamentos dedutíveis, você confere, e ele guarda. O CPF não é guardado; o de terceiros fica mascarado. Dá para levar o salário e os pagamentos daquele ano para o BudgetONE — marcado só o que o BudgetONE ainda não tem.',
    'Restituição e processos: restituição, malha fina, retificação, imposto a pagar, parcelamento e protocolos do e-CAC, com estado, prazo, anotações e histórico. Declaração com restituição cria o acompanhamento sozinha; restituição marcada como recebida vira renda no BudgetONE. O que está aberto passa na fita do topo.',
    'PJ × CLT refeito: o PJ agora é calculado de verdade no Simples Nacional — Anexo III ou V pelo Fator R, DAS efetivo, INSS de 11% e IR do pró-labore. O app avisa quando subir o pró-labore para 28% da nota baixa o imposto.',
    'Deduções: saúde, educação, previdência e pensão marcadas no BudgetONE, por ano e por pessoa — e uma lista de possíveis esquecidas, para marcar com um toque.',
    'Salário cadastrado uma vez vale nos três apps: no BudgetONE (Renda), no InvestifyONE (Painel e Prognóstico: quanto sobra por mês para investir, com botão para usar como aporte) e no TaxONE.',
    'Cadastro de salário: quem recebe, quem paga, tipo (CLT, pró-labore, PJ, outro), bruto ou líquido — obrigatório escolher —, cálculo de INSS e IR ligado ou desligado, dependentes, outros descontos da folha, holerite (PDF ou foto) e vigência: vale de tal data até tal data, ou até cadastrar outro.',
    'Cadastrar outro salário da mesma pessoa no mesmo período faz o app perguntar: Substituir (aumento, troca de emprego — o anterior termina na véspera) ou Complementar (outra renda, os dois valem).',
    'Lançamento avulso de salário também pede bruto ou líquido e oferece calcular o imposto. No caixa entra o líquido; o bruto fica guardado para o TaxONE.',
    '"Salário Fulano (liquido)" deixou de existir como categoria. Todos os lançamentos, categorias e lançamentos fixos viraram "Salário", com o nome da pessoa em Quem recebeu e a marca "líquido". Reimportar a planilha antiga usa a mesma regra e não traz a categoria velha de volta.',
    'Microfone: enquanto ouve, um anel em volta do botão cresce com o volume da voz. Se travar, o app diz em qual etapa parou — sem som (microfone errado ou mudo), ou ouviu e o serviço do Google não respondeu — e o que fazer.',
    'Consertado: ler PDF no "Importar arquivo" nunca funcionou desde a 3.7 (o leitor recebia os bytes em vez do arquivo). E o leitor passou a entender PDFs com compressão ASCII85.',
    'Consertado: as janelas de lançamento e de salário acumulavam ouvintes de eventos a cada abertura.',
    'Consertado: na configuração da barra de baixo, os nomes das abas apareciam em branco.'
  ]},
  {v:'3.9', d:'2026-09-25', t:'Botões de valor, cartão e fatura, busca de banco', itens:[
    'Botões −/+ do valor voltaram a funcionar. O defeito: a cada toque a linha de botões era redesenhada entre o "apertar" e o "soltar" do dedo, então o botão tocado sumia antes do clique — só o 0 funcionava. Agora os botões são criados uma vez e só o número escrito neles muda, depois do toque.',
    'Os degraus continuam mudando com o tamanho do valor (vazio: 10, 50, 100, 500; perto de 55: 1, 5, 10, 50) e os centavos ficam nas setinhas do campo. Segurar um botão repete, mas só depois de meio segundo — antes, um toque mais demorado somava duas vezes.',
    'O 0 azul esvazia o campo: digitar depois dá "55", e não mais "055".',
    'Novo "i" ao lado do microfone explicando todos os jeitos de mudar o valor sem digitar.',
    'Microfone: agora diz exatamente o que houve — bloqueado no navegador (e como liberar), arquivo aberto do computador (onde o navegador não libera microfone), sem microfone no sistema, sem internet.',
    'Compra no cartão ganhou duas datas: a da compra e a do dia em que a fatura cobra. O app calcula pela data de fechamento e de vencimento do cartão, mostra as duas no lançamento, e você pode corrigir. Na lista, a data da cobrança aparece com 💳 embaixo da data da compra.',
    'Parcela de compra antiga ("PARC 03/10") vai para a fatura certa, e a parcela 4/10 não é mais confundida com a 3/10.',
    'Conta e cartão sem contar a fatura duas vezes: quando as compras de uma fatura estão no app, o "PAGTO FATURA" da conta corrente não entra como gasto. Se o pagamento entrou antes (você importou a conta primeiro), ao importar o cartão o app oferece tirá-lo — marcado quando veio de extrato, desmarcado quando foi lançado à mão.',
    'Extrato de cartão que não está cadastrado: a prévia pede o dia de fechamento e o de vencimento e cadastra o cartão ali mesmo.',
    'Cadastrar banco: a lista ganhou busca pelo nome ou pelo código, ordem alfabética, selo colorido e ★ favoritos no topo.',
    '"Quem pagou" virou "Quem pagou/recebeu" — vale para gasto e para renda.',
    'Cinco "i" do BudgetONE não abriam nada (para onde foi, mês a mês, meses caros, fôlego, patrimônio). Agora todos explicam a tela.',
    'A explicação do "i" aberta de dentro de outra janela ficava escondida atrás dela. Agora vem sempre na frente.'
  ]},
  {v:'3.8', d:'2026-09-25', t:'Extrato do banco entra nos lançamentos', itens:[
    'Extrato OFX agora entra de verdade nos seus lançamentos. Antes de importar, a prévia mostra quantos são novos, quantos já tinham vindo e quantos parecem repetidos — e o botão faz exatamente o que a prévia mostrou.',
    'Não duplica: cada lançamento do extrato tem um código do banco, e o app guarda esse código. Importar o mesmo extrato de novo, ou um extrato que cobre parte do mesmo período, só traz o que falta. Dois gastos iguais no mesmo dia (dois cafés de R$ 6) continuam sendo dois.',
    'Parecidos ficam de fora: se um lançamento do extrato bate data e valor com algo que você já lançou (por exemplo, pela planilha), ele não entra — a não ser que você marque a caixa. Dá para ver a lista antes.',
    'Extrato de cartão: o pagamento da fatura e os estornos não entram. Senão o pagamento da fatura viraria "renda" e o app diria que você ganha mais do que ganha.',
    'Tudo que vem do extrato chega marcado "revisar", saídas em "Sem grupo" e créditos em "Renda". O filtro Revisar em Lançamentos junta todos para você dar o grupo certo.',
    'Acentos: extrato de banco brasileiro costuma vir em outra codificação, e "CRÉDITO" aparecia como "CR�DITO". Agora o app lê a codificação que o arquivo declara.',
    'Segurança: em extrato de cartão o banco manda o número do cartão no campo da conta. O app agora guarda e mostra só o final de 4 dígitos.',
    'Modo sem internet: ao atualizar, o MoneyTRIO apagava a cópia offline dos seus outros apps (todos moram no mesmo endereço). Agora só apaga as versões antigas dele mesmo.'
  ]},
  {v:'3.7', d:'2026-09-25', t:'Importar arquivo, não só planilha', itens:[
    '"Importar planilha" virou "Importar arquivo" e passou a aceitar CSV, TXT, TSV, XML, OFX, XLSX, DOCX e PDF — reconhecendo o formato pelo conteúdo, não pela extensão, que mente.',
    'Extrato OFX do banco: o app lê a conta, o período, o saldo e todos os lançamentos, e mostra quanto entrou e quanto saiu. Identifica o banco pelo código e põe o selo dele. Trazer os lançamentos para dentro ainda não está ligado — quero fazer com a mesma conferência de duplicados que a planilha já tem, senão é fácil lançar o mesmo gasto duas vezes.',
    'XLSX de verdade: o app abre o ZIP da planilha e lê o dicionário de textos e a primeira aba, com acento e tudo. Se for a sua planilha de gastos, segue o caminho de sempre; se não for, mostra as primeiras linhas para você conferir.',
    'DOCX: lê os parágrafos e as tabelas do documento.',
    'XLS e DOC antigos (o formato binário dos anos 90) continuam de fora, e agora o app diz isso com todas as letras em vez de falhar calado: abra e salve como .xlsx, .docx ou .csv.',
    'Tudo isso sem biblioteca de fora: o leitor de ZIP e de planilha foi escrito aqui, usando só o que o navegador já tem.'
  ]},
  {v:'3.6', d:'2026-09-25', t:'O menu voltou a funcionar', itens:[
    'Menus parados: o ☰, a barra de baixo e o menu da lateral não levavam a lugar nenhum. A causa era minha, da 3.5: para pintar cada app de uma cor eu marquei a página com data-app — e o app já usava data-app nos cartões do hub para TROCAR de aplicativo. Como a busca do clique sobe até achar o ancestral mais próximo com esse atributo, qualquer toque na tela achava a própria página e disparava "abrir app", que voltava para a primeira aba e fechava a gaveta. A marca da cor passou a se chamar outra coisa, e ficou um comentário no código explicando, para ninguém repetir.',
    'Os resultados da lupa não levavam a lugar nenhum: o painel de ajuda continuava aberto por cima. Agora o resultado do glossário fecha a ajuda e abre a explicação, e o do Coach fecha a ajuda e vai para a aula.',
    'A cor de cada app agora vale no nome inteiro, em todo lugar: o ONE do BudgetONE é azul, o do InvestifyONE é verde e o do TaxONE é laranja — no menu inicial do MoneyTRIO, dentro do próprio app e no menu de troca.',
    'O arranque ganhou uma marca de vida (window.__eventosLigados). Se a navegação morrer de novo, dá para saber em um segundo se foi antes ou depois de ligar os eventos.'
  ]},
  {v:'3.5', d:'2026-09-24', t:'Correções do dia e a cor de cada app', itens:[
    'Botão saindo para fora do cartão nas Configurações: era tabela sem invólucro de rolagem. Achei 12 no código e passei a envolver todas de uma vez, então a de hoje e a que aparecer amanhã ficam certas.',
    'A régua de valores virou uma linha só: os negativos à esquerda, o 0 em azul no meio e os positivos à direita — na mesma ordem em que os números andam na reta. Cabe em tela de 320 px.',
    'O microfone que não fazia nada: quando o navegador recusava, o erro era engolido em silêncio. Agora ele diz o que houve — sem permissão, sem entender, ou navegador que tem o botão mas não tem o serviço. E some sozinho depois de 12 segundos sem resposta, em vez de ficar aceso para sempre.',
    'O campo pisca em azul quando o valor chega pela voz, e a régua reaprende a escala do número novo.',
    'Lista de instituições do InvestifyONE: ganhou selo colorido, ordem alfabética, busca, favoritas com ★ no topo e um botão para cadastrar uma que não está na lista. O selo sai da cor oficial quando a instituição também é um banco conhecido, e do próprio nome quando não é.',
    'O BudgetONE ficou azul, o InvestifyONE continua verde e o TaxONE fica âmbar. Muda só o destaque: o que é positivo continua verde e o negativo vermelho, senão a cor deixaria de querer dizer alguma coisa.',
    'O nome do app lá em cima virou menu de troca, que abre com movimento e mostra os dois apps prontos mais o MoneyTRIO inteiro.',
    'O ☰ saiu do rodapé: ele já existia no topo, e dois menus iguais em cantos opostos só confundem. Com isso cabe um favorito a mais embaixo (agora são cinco).',
    'A lupa 🔎 apareceu no topo. A busca já existia, mas ficava escondida atrás do ?.',
    'Microfone também na IA: dá para falar a pergunta. Ele escreve na caixa e espera você conferir — não manda sozinho.'
  ]},
  {v:'3.4', d:'2026-09-24', t:'Banco, cartão, valor no dedo e voz', itens:[
    'Cadastro de bancos: escolha de uma lista pronta com 27 instituições, cada uma já com nome, código do banco e CNPJ. O selo colorido é desenhado pelo próprio app, com a cor da instituição — não uso a marca de ninguém.',
    'Cadastro de cartões: apelido, bandeira, últimos 4 dígitos, banco, dia em que a fatura fecha e dia do pagamento. O app passa a somar sozinho quanto está aberto em cada fatura. O número inteiro do cartão não entra aqui e nunca deve ser digitado em app nenhum.',
    '"Como pagou" deixou de ser texto solto: virou uma lista com Pix, crédito, débito, boleto, transferência, débito automático, espécie e vale. Escolheu Pix ou boleto, ele pergunta o banco; escolheu cartão, pergunta qual. O que já estava escrito foi convertido sozinho, sem perder nada.',
    'A foto do cupom agora também lê como foi pago: reconhece a forma, o banco, a bandeira e o final do cartão, e já deixa tudo escolhido no formulário. Se o cartão está cadastrado, ele mesmo diz se é crédito ou débito.',
    'Digitar valor no celular: embaixo de cada campo de dinheiro aparecem botões de somar e subtrair, de um centavo a cinquenta mil, escolhidos pelo tamanho do número que já está lá. Segurar repete.',
    'Ditado por voz: onde tem valor, tem microfone. Falar "mil e duzentos", "R$ 1.234,56" ou "doze reais e cinquenta" escreve o número certo. Funciona no Chrome e no Edge; o Safari do iPhone não tem reconhecimento de voz, e lá o microfone nem aparece.',
    'Leitura em voz alta: os cartões de explicação ganharam um botão 🔊 que lê o texto no idioma escolhido. Funciona em todo aparelho atual, inclusive iPhone.',
    'Salário bruto → líquido, com as tabelas de 2026: INSS por faixa e imposto de renda com a regra nova, que zera o imposto até R$ 5.000 e vai soltando aos poucos até R$ 7.350. Dá para fazer o caminho inverso também: sei o líquido, quanto é o bruto.',
    'Comparação PJ × CLT: põe os dois na mesma régua, contando 13º, férias com um terço e FGTS de um lado, e imposto, contador e o que o PJ precisa guardar sozinho do outro. Diz quanto uma proposta PJ precisa ser para empatar.',
    'No computador, quando as opções do menu da esquerda não cabem na altura, a lista passa a rolar com a barra à mostra — e o calendário do BudgetONE continua aparecendo inteiro embaixo.',
    'A frequência de cada compromisso agora está escrita por extenso no calendário e no passo a passo: "toda segunda-feira", "todo dia 10", "anual em janeiro". Antes só aparecia o número do dia.',
    'Sair do passo a passo com valores preenchidos passou a perguntar se você quer salvar, em vez de jogar o trabalho fora em silêncio.',
    'A IA não vê mais os nomes que você escreveu nos lançamentos, a não ser que você ligue a chavinha. Desligada, ela recebe a categoria no lugar — "Escola" em vez de "Escola da Ana". E a tela mostra, aberta, exatamente o que sai daqui junto com a pergunta.'
  ]},
  {v:'3.3', d:'2026-09-19', t:'Mais fácil de usar, e mais seguro', itens:[
    'A tela ficou mais calma: menos coisa aparecendo ao mesmo tempo, texto comprido dobrado com um "ler mais", e cada bloco das Configurações fechado até você tocar nele.',
    'Central de ajuda num botão só, o ? do topo: a ajuda desta tela, o tutorial de cinco passos, os atalhos para começar e uma busca que procura no glossário e nas aulas.',
    'Na primeira vez o tutorial abre sozinho. Depois disso, só quando você pedir.',
    'Os filtros de período viraram seis botões e um seletor de ano, em vez de uma parede de botões.',
    'Os avisos que aparecem no canto ficaram curtos: cabem em duas linhas no celular, nos dois idiomas.',
    'O nível das explicações só aparece onde muda alguma coisa — no Coach, no Glossário e nas telas que têm ⓘ. Onde não muda nada, some.',
    'Cada explicação tem texto próprio em iniciante, médio e expert, nos dois idiomas: 137 verbetes do glossário e 18 aulas do Coach, escritos um a um.',
    'O espelho da carteira em cookie vem desligado a partir desta versão. Um cookie sobe junto com todo pedido feito ao site, então a sua lista de ativos passaria pelo servidor a cada visita. Quem já tinha ligado foi desligado uma vez, com aviso na tela; nada foi perdido, e dá para religar em Configurações.',
    'Link que vem de fora — de uma notícia, de um anúncio, de um QR code — agora só é aceito se começar com http ou https. Antes, um endereço maldoso podia rodar código dentro do app.',
    'Pacote com página de teste: abre num servidor local e confere sozinho se os cinco arquivos do GitHub estão inteiros e se a carteira saiu cifrada.',
    'Um documento novo, ARQUITETURA.md, explica o que cada arquivo faz e o que nunca mexer — para quando você pedir uma mudança a mim ou a outra IA.'
  ]},
  {v:'3.2', d:'2026-09-18', t:'Inglês de verdade, e a diarista', itens:[
    'O inglês passou a valer na tela inteira: título, indicador, cabeçalho de tabela, filtro, legenda de gráfico e botão. Eram 431 textos ainda em português; sobrou zero.',
    'A tradução acontece no instante em que a tela é desenhada, sem ficar vigiando a página — em português a passagem não faz nada, e no celular não mudou nada de velocidade.',
    'O que você escreveu nunca é traduzido: nome de categoria, de fundo, de pessoa e descrição de lançamento aparecem como você digitou, nos dois idiomas.',
    'Serviço por visita: a pessoa vem em dias certos e o pagamento junta os dias trabalhados, na última segunda do mês ou no dia que você escolher.',
    'Feriado nacional já vem calculado, inclusive Carnaval, Sexta-feira Santa e Corpus Christi, que mudam de data todo ano. Em feriado ela não vem, e o dia não entra no pagamento.',
    'Trocou a segunda pela terça: o dia conta igual. Veio num domingo extra: vale mais, com valor sugerido, e pode substituir o dia seguinte.',
    'Reajuste com data: de R$ 250 para R$ 276 a partir de novembro. O passado continua com o valor antigo nos gráficos; o futuro, nas provisões, já usa o novo.',
    'O calendário agora leva a algum lugar: tocar num vencimento abre a tela dele, com o estado do pagamento, o valor só daquele mês e de onde o valor saiu.',
    'Feriado pintado no calendário, e o dia avisa quando é.',
    'O nível das explicações voltou para o pé do menu no InvestifyONE, com as palavras de antes. No BudgetONE só fica o calendário, e o PT/EN mora no topo, uma vez só.',
    'A fita do topo, o rodapé e a cláusula de uso também falam inglês — inclusive as frases que misturam texto e número.',
    'As notas de versão continuam em português de propósito: são um registro histórico, e a tela avisa isso em inglês.'
  ]},
  {v:'3.1', d:'2026-09-18', t:'As diretrizes gerais, do jeito do MoneyTRIO', itens:[
    'Instalar na tela de início: o MoneyTRIO vira ícone no celular e no computador, abre em tela cheia e funciona sem internet — só cotação e notícia precisam de rede.',
    'Conta com apelido, e-mail e senha, e um código de recuperação que aparece uma vez. Usar o código queima o código: sai um novo e o antigo deixa de valer.',
    'Três tipos de acesso na entrada: visitante (nada é salvo, vê anúncio), assinante e anunciante (dados salvos, sem anúncio). A senha da carteira continua sendo outra coisa, e continua igual.',
    'Painel do anunciante: exibições, cliques e a proporção entre os dois, com campanhas que trocam o texto e o link do banner.',
    'Avisos separados por tipo — conta a vencer, entrada de dinheiro, categoria acima do normal, variação da carteira e prazos do IR — com chavinha em cada um.',
    'Horário silencioso das 22:00 às 07:00: o aviso não some, fica guardado e sai quando o silêncio acaba.',
    'Os avisos saem do que o app já sabe: os vencimentos dos compromissos, as entradas do dia e a categoria que passou da média dos últimos seis meses.',
    'Tabela larga passou a rolar dentro do cartão no celular, em vez de esticar a página inteira e deixar tudo torto.',
    'Senha de conta nunca fica em texto puro: PBKDF2 com 150 mil voltas, e o código de recuperação também guardado só como resumo.'
  ]},
  {v:'3.0', d:'2026-09-18', t:'MoneyTRIO: idioma, calendário e contas a pagar', itens:[
    'Português e inglês, com o botão de troca rápida sempre visível no topo e no pé do menu.',
    'Datas no formato da região: 18/Set/2026 em português, Sep/18/2026 em inglês, com o mês em três letras traduzido.',
    'Varredura da tradução nas Configurações, que lista o que ainda falta a cada versão.',
    'Calendário de verdade no lugar do seletor de nível: mês pintado com o que cai em cada dia, e o mesmo calendário nos campos de data.',
    '"Custos fixos" virou "Custos", com quatro abas: Recorrentes, Pontuais, Calendário e Revisar.',
    'Regras de repetição de verdade: todo dia X, no 5º dia útil, na última segunda-feira, toda terça, ou uma vez por ano — e de quantos em quantos meses.',
    'Estado de cada vencimento: pendente, agendado, débito automático, pago, pagamento confirmado, cancelado. O que venceu sem marcação vira atrasado sozinho.',
    'Conciliação automática: o app procura, entre os lançamentos importados, qual corresponde a cada vencimento em aberto.',
    'Favoritos e bandeira de revisão em lançamentos e compromissos, com filtro próprio.',
    'Filtros de período prontos: mês atual, mês passado, ano atual, últimos 12 e 24 meses, e cada ano.',
    'Categorias criadas na hora, dentro do grupo escolhido, sem sair do formulário.',
    'O app avisa quando um gasto novo parece ser conta fixa que ainda não está cadastrada.',
    'OCR de cupom fiscal: lê o total, a data, o CNPJ e os itens da foto, mostra o quanto confia na leitura e deixa tudo editável.',
    'Passo a passo com oito etapas: renda, moradia, outros imóveis, veículos, seguros, filhos e assinaturas.',
    'Modo visitante sem salvar nada, banner ANUNCIE AQUI dispensável, biometria pelo WebAuthn e compartilhamento nativo.',
    'Painel fixo na barra de baixo, e o nome do conjunto passou a ser MoneyTRIO.',
    'Números no formato do idioma: R$ 1.234,56 em português, R$ 1,234.56 em inglês.',
    'Sem internet, o app dá um aviso só, em português, dizendo de quando são os preços na tela — antes cada fonte devolvia o seu próprio erro técnico.',
    'Os indicadores do topo ficam lado a lado no celular, em vez de empilhados ocupando meia tela.'
  ]},
  {v:'2.1', d:'2026-09-17', t:'Celular, filtros e o que se repete', itens:[
    'O menu voltou a funcionar: os cliques passaram a ser capturados no documento, então as abas continuam vivas depois que a navegação é remontada.',
    'A barra de baixo no celular parou de ocupar a tela inteira, e agora dá para escolher e arrastar quais botões ficam nela, em cada app.',
    'Carteira quatro vezes menor no armazenamento: os gastos passaram a ser guardados em formato compacto. No celular, abrir caiu de alguns segundos para cerca de um segundo e meio.',
    'Barra de filtros igual em todas as telas do BudgetONE: período pronto (12 meses, 24 meses, cada ano), grupo, categoria, quem pagou e como pagou.',
    'Tela de Fluxo nova: dois painéis alinhados no tempo — o acumulado em cima, o que entra e sai de cada mês embaixo — com o valor real do InvestifyONE ao lado do valor pela planilha.',
    'Compromissos que se repetem, com o dia do mês em que caem, inclusive "5º dia útil". Quem troca de emprego desliga o antigo em vez de apagar, e o histórico fica.',
    'Agenda dos próximos 45 dias, e o app sugere compromissos a partir do que já se repetiu no histórico.',
    'A fita do topo no BudgetONE mostra conta a vencer, salário a entrar, categoria que subiu, como vai o mês e o que costuma encarecer — cada aviso pode ser desligado.',
    'Passo a passo para cadastrar renda e custos fixos, com leitura do líquido do holerite em PDF.',
    'Escanear QR de nota fiscal e código de boleto pela câmera, sem biblioteca externa nem enviar imagem para servidor.',
    'Configurações separadas em Compartilhadas, InvestifyONE e BudgetONE — as chaves de API continuam sendo as mesmas para os dois apps.'
  ]},
  {v:'2.0', d:'2026-09-15', t:'MoneyTrio: três apps no mesmo lugar', itens:[
    'Tela de escolha na entrada, com BudgetONE, InvestifyONE e TaxONE. Trocar de app é clicar no nome lá em cima.',
    'BudgetONE novo: custos e renda categorizados em grupo e subcategoria, com periodicidade, forma de pagamento e marca de IRPF.',
    'Importação da planilha de controle de gastos em CSV, com 11 grupos e 157 subcategorias reconhecidos sozinho.',
    'Custo fixo mensal separado do gasto avulso, e aviso quando o período recente foi anotado de forma diferente do antigo.',
    'Projeção de orçamento pelo IPCA de cada grupo (séries 1635 a 1643 do Banco Central), em vez do IPCA cheio para tudo.',
    'Preços de referência: anote quanto custava cada coisa e veja quanto subiu por ano.',
    'Ações e ETFs dos EUA passaram a aparecer separados no gráfico de divisão da carteira.',
    '"Caixa" virou "Dinheiro em conta", e o (i) do gráfico agora explica cada faixa.',
    'Rodapé com versão e data, e este histórico de mudanças.'
  ]},
  {v:'1.9', d:'2026-09-15', t:'Histórico completo da Avenue e do Itaú', itens:[
    'Leitor de CSV da Avenue: compras, vendas, dividendos, cupons, impostos, taxas e remessas.',
    'Juros acumulados na compra de título entram no custo do papel, e estorno abate em vez de somar.',
    'Aviso de provável desdobramento quando o preço de compra é múltiplo redondo do preço médio.',
    'Extrato de fundos do Itaú passou a lançar cada aplicação e resgate com a data real, em vez de um saldo único.',
    'Acerto de histórico: o saldo inicial estimado sai do livro quando o extrato explica a posição inteira.',
    'Reimportar o mesmo extrato não duplica nada.'
  ]},
  {v:'1.8', d:'2026-09-14', t:'Rentabilidade de verdade', itens:[
    'XIRR (retorno do bolso) e TWR (retorno da estratégia), com comparação contra CDI, Ibovespa, S&P 500 e dólar.',
    'Livro de movimentações: aportes, compras, vendas, proventos, juros, taxas e impostos.',
    'Importação de extratos em PDF sem biblioteca externa, lendo o texto dentro do próprio navegador.',
    'Perfil de investidor com questionário de suitability e comparação com o risco real da carteira.',
    'Documentação da carteira: quais ativos ainda não têm extrato.'
  ]},
  {v:'1.5', d:'2026-09-14', t:'Gráficos, notícias e Coach', itens:[
    'Gráficos nativos em SVG para cada ativo, patrimônio, mercado e câmbio.',
    'Aba de Notícias com feed público e fita de cotações no topo.',
    'Coach em três níveis e glossário com mais de 130 termos.',
    'Prognóstico: juros compostos, metas e simulador de alocação.'
  ]},
  {v:'1.0', d:'2026-09-13', t:'Primeira versão', itens:[
    'Carteira com Brasil e exterior, cotações de fontes públicas gratuitas.',
    'Dados guardados no navegador, com backup em arquivo e no Google Drive.',
    'Versão publicada com a carteira criptografada por senha, e versão local de arquivo único.'
  ]}
];
