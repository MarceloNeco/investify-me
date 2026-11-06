/* =====================================================================
   modulos/agendamentos.js — agendamentos que vencem (N37)          1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Compromisso pago por "Agendado no banco" ganha "o agendamento vale até" (o banco agenda por um
     tempo, ex.: TED de R$ 700 da Caixa por 12 meses). Um mês antes de acabar, o app avisa
     "renovar o agendamento" (em Custos e na fita do BudgetONE); o botão "Renovei" empurra a data
     pelo ciclo (12 meses, ou o que a pessoa escolheu).
   API (window.Agendamentos)
     de(rid)               → {id, ate, ciclo, renovadoEm} | null      (id = id do compromisso)
     gravar(rid, ate, ciclo)
     renovar(rid, hoje?)   → o registro, com a data nova
     vencendo(hoje?, dias=31) → [{reg, r, dias}]  (compromissos ligados e "agendado no banco")
     maisMeses(iso, n)     → a data n meses depois (31/01 + 1 mês = 28 ou 29/02)
   DADOS
     Store.estado.agendamentos = [{id: <id do compromisso>, ate: 'AAAA-MM-DD', ciclo: 12, renovadoEm}]
   PONTOS QUE USA
     compromisso.form (campos, dentro de "Como paga") · evento compromisso.form (mostra/esconde)
     evento compromisso.salvo (grava) · custos.topo (aviso) · fita.budget (aviso) · recorrente.linha (etiqueta)
     ação agend-renovei (data-id = id do compromisso)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'agendamentos';
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }

  var API = {
    de: function (rid) { return lista().find(function (x) { return x.id === rid; }) || null; },
    maisMeses: function (iso, n) {
      var a = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1 + Number(n), d = Number(iso.slice(8, 10));
      var ano = a + Math.floor(m / 12), mes = ((m % 12) + 12) % 12;
      var ult = new Date(ano, mes + 1, 0).getDate();
      return ano + '-' + ('0' + (mes + 1)).slice(-2) + '-' + ('0' + Math.min(d, ult)).slice(-2);
    },
    gravar: function (rid, ate, ciclo) {
      var c = Math.max(1, Math.min(60, Math.round(Number(ciclo) || 12)));
      var x = API.de(rid);
      if (!ate) { if (x) ST[COL] = lista().filter(function (y) { return y.id !== rid; }); return null; }
      if (!x) { x = { id: rid }; lista().push(x); }
      x.ate = String(ate).slice(0, 10); x.ciclo = c;
      return x;
    },
    renovar: function (rid, hoje) {
      var x = API.de(rid); if (!x || !x.ate) return null;
      x.ate = API.maisMeses(x.ate, x.ciclo || 12);
      x.renovadoEm = String(hoje || hojeISO()).slice(0, 10);
      return x;
    },
    vencendo: function (hoje, dias) {
      hoje = String(hoje || hojeISO()).slice(0, 10); dias = dias == null ? 31 : dias;
      var lim = new Date(hoje + 'T12:00:00'); lim.setDate(lim.getDate() + dias);
      var limISO = lim.getFullYear() + '-' + ('0' + (lim.getMonth() + 1)).slice(-2) + '-' + ('0' + lim.getDate()).slice(-2);
      return lista().map(function (reg) {
        var r = Recorrente.achar(reg.id);
        if (!r || r.ativo === false || r.estadoPadrao !== 'agendado' || !reg.ate || reg.ate > limISO) return null;
        return { reg: reg, r: r, dias: Math.round((new Date(reg.ate + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000) };
      }).filter(Boolean).sort(function (a, b) { return a.reg.ate.localeCompare(b.reg.ate); });
    }
  };

  function frase(v) {
    var quando = v.dias < 0 ? (pt() ? 'acabou em ' : 'ended on ') : (pt() ? 'vale até ' : 'valid until ');
    return (pt() ? 'Renovar o agendamento: ' : 'Renew the bank schedule: ') + v.r.nome + ' (' + fmt(Recorrente.valorEm(v.r, hojeISO())) + ') ' + quando + I18n.data(v.reg.ate);
  }

  MoneyModulos.registrar({
    id: 'agendamentos',
    versao: '1.0.0',
    colecoes: [COL],
    pontos: {
      'compromisso.form': function (ctx) {
        var r = ctx.r || {}, x = r.id ? API.de(r.id) : null;
        return '<div class="ag-box' + ((r.estadoPadrao || '') === 'agendado' ? '' : ' hidden') + '" id="agBox">' +
          '<div class="grid g2">' +
            campo(pt() ? 'O agendamento vale até' : 'The bank schedule is valid until', Cal.campo('agAte', (x && x.ate) || '', { vazio: pt() ? 'não sei' : 'not sure' }),
              null, pt() ? 'O banco agenda por um tempo (ex.: 12 meses). Um mês antes, o app avisa para renovar.' : 'Banks schedule for a while (e.g. 12 months). A month before, the app reminds you to renew.') +
            campo(pt() ? 'Renova a cada (meses)' : 'Renews every (months)', '<input type="number" id="agCiclo" min="1" max="60" inputmode="numeric" value="' + ((x && x.ciclo) || 12) + '">') +
          '</div></div>';
      },
      'custos.topo': function () {
        var v = API.vencendo();
        if (!v.length) return '';
        return '<div class="aviso-box ag-aviso">' + v.map(function (x) {
          return '<div class="row" style="align-items:center;gap:8px;margin:4px 0"><span class="small" style="flex:1">🏦 ' + esc(frase(x)) + '</span>' +
            '<button class="btn sm primary" data-acao="agend-renovei" data-id="' + esc(x.r.id) + '">' + (pt() ? 'Renovei' : 'Renewed') + '</button></div>';
        }).join('') + '</div>';
      },
      'fita.budget': function () {
        return API.vencendo().map(function (x) { return { ico: '🏦', texto: frase(x), tom: x.dias < 0 ? 'down' : 'warn' }; });
      },
      'recorrente.linha': function (ctx) {
        var r = ctx.r || {}, x = r.id ? API.de(r.id) : null;
        if (!x || !x.ate || r.estadoPadrao !== 'agendado') return '';
        return '<div class="t-sub">🏦 ' + esc((pt() ? 'agendado até ' : 'scheduled until ') + I18n.data(x.ate)) + '</div>';
      }
    },
    ouvir: {
      'compromisso.form': function () {
        var box = document.getElementById('agBox'); if (!box) return;
        document.querySelectorAll('#assetModalBody input[name="rcEstadoR"]').forEach(function (e) {
          e.addEventListener('change', function () { box.classList.toggle('hidden', e.value !== 'agendado' || !e.checked); });
        });
      },
      'compromisso.salvo': function (d) {
        if (!d || !d.id || !document.getElementById('agAte')) return;
        if (d.estadoPadrao !== 'agendado') return;
        API.gravar(d.id, document.getElementById('agAte').value, document.getElementById('agCiclo').value);
      }
    },
    acoes: {
      'agend-renovei': function (el) {
        var x = API.renovar(el.dataset.id); if (!x) return;
        Store.salvar(); render(); renderFita();
        toast((pt() ? 'Agendamento renovado: vale até ' : 'Schedule renewed: valid until ') + I18n.data(x.ate) + '.');
      }
    }
  });
  window.Agendamentos = API;
})();
