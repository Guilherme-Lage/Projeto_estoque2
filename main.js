let totalItens = 0;
let conferidos = 0;
let mostrarApenasPendentes = true;

// ─── ESTADO GLOBAL DO CABEÇALHO ──────────────────────────────────────────────
// Guardamos o cabeçalho em um objeto global para não depender de querySelector frágil
let cabecalhoAtual = {
    nRomaneio: '---', dataHora: '---', requisitante: '---',
    contato: '---', os: '---', placa: '---', cliente: '---', modelo: '---'
};

// ─── ESTADO GLOBAL DOS ITENS ──────────────────────────────────────────────────
// Cada item: { locacao, qtd (total), codigo, descricao }
let itensAtuais = [];

// ID do romaneio aberto agora
let romaneioIdAtivo = null;

// Controle de sincronização
let ultimoIdSincronizado = null;
let ultimoHashChecks = '';
let enviandoCheck = false;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function renderizarCabecalho(cab) {
    cabecalhoAtual = cab;
    const painel = document.getElementById('painel-cabecalho');
    if (!painel) return;
    painel.style.display = 'block';
    painel.innerHTML = `
        <div class="cabecalho-topo">
            <span id="cab-num-romaneio">Romaneio Nº: ${cab.nRomaneio}</span>
            <span id="cab-data-romaneio">Data: ${cab.dataHora}</span>
        </div>
        <div class="cabecalho-corpo" id="cabecalho-corpo">
            <div class="cabecalho-item"><span>REQ:</span> <strong id="cab-req">${cab.requisitante}</strong></div>
            <div class="cabecalho-item"><span>CONTATO:</span> <strong id="cab-contato">${cab.contato}</strong></div>
            <div class="cabecalho-item"><span>OS:</span> <strong id="cab-os">${cab.os}</strong></div>
            <div class="cabecalho-item"><span>PLACA:</span> <strong id="cab-placa">${cab.placa}</strong></div>
            <div class="cabecalho-item item-full"><span>CLIENTE:</span> <strong id="cab-cliente">${cab.cliente}</strong></div>
            <div class="cabecalho-item item-full"><span>MODELO:</span> <strong id="cab-modelo">${cab.modelo}</strong></div>
        </div>
    `;
}

// Lê os valores numéricos atuais de cada item da tabela
function lerEstadoChecks() {
    const estado = {};
    itensAtuais.forEach((_, idx) => {
        const span = document.getElementById(`cont-item-${idx}`);
        estado[idx] = span ? parseInt(span.getAttribute('data-atual') || '0') : 0;
    });
    return estado;
}

function hashChecks(estado) {
    return JSON.stringify(estado);
}

// ─────────────────────────────────────────────────────────────────────────────
// CARREGAR ARQUIVO
// ─────────────────────────────────────────────────────────────────────────────

function carregarArquivo(input) {
    if (typeof totalItens !== 'undefined' && totalItens > 0) {
        salvarNoHistorico();
    }
    const arquivo = input.files[0];
    if (!arquivo) return;
    document.getElementById('legenda-arquivo').textContent = arquivo.name;
    const leitor = new FileReader();
    leitor.onload = function (e) { processarTexto(e.target.result); };
    leitor.readAsText(arquivo, 'ISO-8859-1');
}

function processarTexto(texto) {
    const linhas = texto.split('\n');

    const nRomaneio = texto.match(/N[º°\.]?\s*[:\.]?\s*(\d+)/i)?.[1] || '---';
    const dataHora = texto.match(/(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/)?.[1] || '---';
    const requisitante = texto.match(/REQ\.?[:\.]?\s*(.*?)\s*CONTATO/i)?.[1]?.trim() || '---';
    const contato = texto.match(/CONTATO\s*[:\.]?\s*(\d+)/i)?.[1] || '---';
    const os = texto.match(/OS\s*[:\.]?\s*(\d*)/i)?.[1] || '---';
    const cliente = texto.match(/CLIENTE\s*[:\.]?\s*(.*?)\s*PLACA/i)?.[1]?.trim() || '---';
    const placa = texto.match(/PLACA\s*[:\.]?\s*(.*?)(?=\s*\||\n|$)/i)?.[1]?.trim() || '---';
    const modelo = texto.match(/MODELO\s*[:\.]?\s*(.*?)(?=\s*\||\n|$)/i)?.[1]?.trim() || '---';

    const cab = { nRomaneio, dataHora, requisitante, contato, os, placa, cliente, modelo };
    renderizarCabecalho(cab);

    const itens = [];
    const regex = /\|\s+([\d.A-Za-z]+)\s+([\d,]+)\s+(\d+)\s+(.*?)\s*\|/;
    for (let linha of linhas) {
        const match = linha.match(regex);
        if (match) {
            const locacao = match[1].trim();
            const qtd = match[2].trim().replace(',', '.');
            const codigo = match[3].trim();
            const descricao = match[4].trim();
            if (locacao === 'LOCACAO' || locacao === '--LOCACAO--') continue;
            itens.push({ locacao, qtd, codigo, descricao });
        }
    }

    const corpoTabela = document.getElementById('corpo-tabela');
    if (itens.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="5" class="estado-vazio"><p>Nenhum item encontrado no arquivo</p></td></tr>`;
        return;
    }

    itensAtuais = itens;
    totalItens = itens.length;
    romaneioIdAtivo = nRomaneio;

    document.getElementById('secao-contador').style.display = 'block';
    document.getElementById('botao-limpar').style.display = 'inline-block';
    document.getElementById('info-romaneio').style.display = 'block';
    document.getElementById('info-romaneio').textContent = `Romaneio N°: ${nRomaneio} | Itens: ${totalItens}`;

    corpoTabela.innerHTML = '';
    itens.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.id = `linha-${idx}`;
        const valorQtdTotal = parseInt(item.qtd);
        const classeDestaque = valorQtdTotal > 1 ? 'qtd-multipla' : '';
        tr.setAttribute('onclick', `incrementarItem(${idx}, ${valorQtdTotal})`);
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
            <td class="col-locacao">${item.locacao}</td>
            <td class="col-qtd">
                <span class="${classeDestaque}">
                    <span id="cont-item-${idx}" data-atual="0">0</span> / ${valorQtdTotal}
                </span>
            </td>
            <td class="col-codigo">${item.codigo}</td>
            <td class="col-descricao">${item.descricao}</td>
            <td class="col-check" style="text-align: center;">
                <div id="status-quadrado-${idx}" class="quadrado-status status-vazio"></div>
                <input type="checkbox" id="chk-${idx}" style="display:none">
            </td>
        `;
        corpoTabela.appendChild(tr);
    });

    atualizarContadorGeral();

    // Avisa o servidor que este romaneio está ativo (PC e celular ficam cientes)
    fetch(`${window.location.origin}/definir-ativo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nRomaneio, cabecalho: cab, itens: itens })
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÃO COM OS ITENS
// ─────────────────────────────────────────────────────────────────────────────

function incrementarItem(idx, totalMaximo) {
    const spanContador = document.getElementById(`cont-item-${idx}`);
    const linha = document.getElementById(`linha-${idx}`);
    const quadrado = document.getElementById(`status-quadrado-${idx}`);
    const checkbox = document.getElementById(`chk-${idx}`);

    let valorAtual = parseInt(spanContador.getAttribute('data-atual'));

    if (valorAtual >= totalMaximo) {
        if (alert(`⚠️Atenção: \n Foi colocado uma peça a mais favor devolver`)) {
            valorAtual++;
        } else {
            valorAtual++;
        }
    } else {
        valorAtual++;
    }

    spanContador.textContent = valorAtual;
    spanContador.setAttribute('data-atual', valorAtual);

    quadrado.className = 'quadrado-status';
    quadrado.innerHTML = '';
    checkbox.checked = false;
    linha.classList.remove('linha-conferida', 'linha-pendente', 'linha-excesso');

    if (valorAtual === 0) {
        quadrado.classList.add('status-vazio');
    } else if (valorAtual > 0 && valorAtual < totalMaximo) {
        quadrado.classList.add('status-pendente');
        quadrado.innerHTML = '!';
        linha.classList.add('linha-pendente');
    } else if (valorAtual === totalMaximo) {
        quadrado.classList.add('status-concluido');
        quadrado.innerHTML = '✓';
        linha.classList.add('linha-conferida');
        checkbox.checked = true;
    } else {
        quadrado.classList.add('status-erro');
        quadrado.innerHTML = 'X';
        linha.classList.add('linha-excesso');
        checkbox.checked = true;
    }

    if (mostrarApenasPendentes && (valorAtual === totalMaximo || valorAtual > totalMaximo)) {
        setTimeout(() => {
            if (mostrarApenasPendentes) linha.style.display = 'none';
        }, 300);
    } else if (valorAtual < totalMaximo) {
        linha.style.display = '';
    }

    atualizarContadorGeral();
    sincronizarClique(); // Avisa servidor — agora sem parâmetros, lê o estado global
}

function atualizarVisualItem(idx, atual, total) {
    const quadrado = document.getElementById(`status-quadrado-${idx}`);
    const linha = document.getElementById(`linha-${idx}`);
    if (!quadrado || !linha) return;

    quadrado.className = 'quadrado-status';
    linha.classList.remove('linha-conferida', 'linha-pendente', 'linha-excesso');
    quadrado.innerHTML = '';
    if (atual > 0 && atual < total) {
        quadrado.classList.add('status-pendente'); // Amarelo
        linha.classList.add('linha-pendente');     // Fundo Amarelo
        quadrado.innerHTML = '!';
    }
    if (atual === 0) {
        quadrado.classList.add('status-vazio');
    } else if (atual < total) {
        quadrado.classList.add('status-pendente');
        quadrado.innerHTML = '!';
        linha.classList.add('linha-pendente');
    } else if (atual === total) {
        quadrado.classList.add('status-concluido');
        quadrado.innerHTML = '✓';
        linha.classList.add('linha-conferida');
    } else {
        quadrado.classList.add('status-erro');
        quadrado.innerHTML = 'X';
        linha.classList.add('linha-excesso');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZAÇÃO — ENVIO (PC → Servidor  ou  Celular → Servidor)
// ─────────────────────────────────────────────────────────────────────────────

function sincronizarClique() {
    // Usa o ID global — não depende mais de querySelector frágil no cabeçalho
    const id = romaneioIdAtivo;
    if (!id || id === '---') return;

    const estado = lerEstadoChecks();
    const novoHash = hashChecks(estado);
    if (novoHash === ultimoHashChecks) return; // Nada mudou, não envia
    ultimoHashChecks = novoHash;

    fetch(`${window.location.origin}/sincronizar-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, checks: estado, cabecalho: cabecalhoAtual })
    }).catch(err => console.error('Erro ao sincronizar clique:', err));
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZAÇÃO — RECEBIMENTO (Servidor → PC/Celular)
// Polling a cada 1,5s lê o estado do servidor e aplica localmente
// ─────────────────────────────────────────────────────────────────────────────

setInterval(async () => {
    try {
        // 1. Descobre qual romaneio está ativo no servidor
        const resAtivo = await fetch(`${window.location.origin}/obter-ativo`);
        const dadosAtivo = await resAtivo.json();

        if (!dadosAtivo.id || dadosAtivo.id === '---') return;

        // 2. Se o romaneio ativo mudou (novo romaneio aberto no PC) — só aplica no celular
        if (dadosAtivo.id !== ultimoIdSincronizado) {
            ultimoIdSincronizado = dadosAtivo.id;

            // Preenche o cabeçalho com dados do servidor
            if (dadosAtivo.cabecalho) {
                renderizarCabecalho(dadosAtivo.cabecalho);
            }

            // Só popula a tabela no celular (telas menores)
            // No PC a tabela é carregada via arquivo/Apollo
            if (window.innerWidth < 800) {
                sincronizarComBanco(dadosAtivo.id);
            }
        }

        // 3. Busca o estado atual dos checks no servidor
        const idParaChecar = romaneioIdAtivo || dadosAtivo.id;
        const resChecks = await fetch(`${window.location.origin}/status-checks/${idParaChecar}`);
        const dadosChecks = await resChecks.json();

        if (!dadosChecks.checks || Object.keys(dadosChecks.checks).length === 0) return;

        // 4. Compara com o hash local — só aplica se for diferente (evita loop)
        const hashServidor = hashChecks(dadosChecks.checks);
        if (hashServidor === ultimoHashChecks) return;

        // 5. Aplica os checks que vieram do servidor na tabela local
        ultimoHashChecks = hashServidor;
        aplicarChecksDoServidor(dadosChecks.checks);

    } catch (e) { /* servidor temporariamente inacessível */ }
}, 1500);

// Aplica o estado de checks recebido do servidor na tabela exibida
function aplicarChecksDoServidor(checks) {
    if (!itensAtuais || itensAtuais.length === 0) return;

    Object.entries(checks).forEach(([idxStr, valorServidor]) => {
        const idx = parseInt(idxStr);
        const span = document.getElementById(`cont-item-${idx}`);
        if (!span) return;

        const valorLocal = parseInt(span.getAttribute('data-atual') || '0');
        if (valorLocal === valorServidor) return; // já está igual

        const item = itensAtuais[idx];
        if (!item) return;
        const total = parseInt(item.qtd);

        span.textContent = valorServidor;
        span.setAttribute('data-atual', valorServidor);
        atualizarVisualItem(idx, valorServidor, total);

        const linha = document.getElementById(`linha-${idx}`);
        if (linha && mostrarApenasPendentes && valorServidor >= total) {
            setTimeout(() => { if (mostrarApenasPendentes) linha.style.display = 'none'; }, 300);
        } else if (linha && valorServidor < total) {
            linha.style.display = '';
        }
    });

    atualizarContadorGeral();
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZAR COM BANCO (Celular carrega romaneio do servidor)
// ─────────────────────────────────────────────────────────────────────────────

async function sincronizarComBanco(id) {
    try {
        const resposta = await fetch(`${window.location.origin}/romaneio/${id}`);
        const romaneio = await resposta.json();

        if (!romaneio || !romaneio.itens_json) return;

        const cabecalhoReal = romaneio.cabecalho_json ?
            JSON.parse(romaneio.cabecalho_json) :
            {
                nRomaneio: id,
                dataHora: romaneio.data || '---',
                requisitante: '---',
                contato: '---',
                os: '---',
                placa: '---',
                cliente: romaneio.cliente || '---',
                modelo: '---'
            };

        const registroParaHistorico = {
            nome: `Romaneio ${id}`,
            data: romaneio.data,
            total: romaneio.total_itens,
            concluidos: 0,
            produtos: JSON.parse(romaneio.itens_json),
            cabecalho: cabecalhoReal
        };

        let historicoLocal = JSON.parse(localStorage.getItem('historico_hontec') || '[]');
        historicoLocal = historicoLocal.filter(h => (h.cabecalho?.nRomaneio || h.id) !== id);
        historicoLocal.unshift(registroParaHistorico);
        localStorage.setItem('historico_hontec', JSON.stringify(historicoLocal.slice(0, 8)));

        carregarDoHistorico(0);
    } catch (err) {
        console.error('Erro na sincronização:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSCA / FILTRO
// ─────────────────────────────────────────────────────────────────────────────

async function filtrarTabela() {
    const busca = document.getElementById('busca-codigo').value.toLowerCase().trim();
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    if (busca === '') {
        linhas.forEach(linha => {
            if (linha.querySelector('.estado-vazio')) return;
            linha.style.display = (mostrarApenasPendentes && linha.classList.contains('linha-conferida')) ? 'none' : '';
        });
        return;
    }

    const buscaEhNumero = /^\d+$/.test(busca);
    let codigoTraduzido = busca;

    if (busca.length > 8 && buscaEhNumero) {
        try {
            const resposta = await fetch(`${window.location.origin}/buscar-produto/${busca}`);
            if (resposta.ok) {
                const produtos = await resposta.json();
                codigoTraduzido = produtos[0].ITEM_ESTOQUE_PUB.toString().toLowerCase().trim();
            }
        } catch (err) { console.error('Erro no banco:', err); }
    }

    linhas.forEach(linha => {
        if (linha.querySelector('.estado-vazio')) return;
        const textoCodigo = linha.querySelector('.col-codigo')?.innerText.toLowerCase().trim() || '';
        const textoDescricao = linha.querySelector('.col-descricao')?.innerText.toLowerCase() || '';
        let corresponde = false;
        if (buscaEhNumero) {
            corresponde = textoCodigo.includes(codigoTraduzido);
        } else {
            corresponde = textoDescricao.includes(busca);
        }
        linha.style.display = corresponde ? '' : 'none';
    });
}

document.getElementById('busca-codigo').addEventListener('keydown', async function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    dispararBusca(this, this.value);

    const termoBusca = this.value.trim();
    if (termoBusca === '') return;

    const linhas = document.querySelectorAll('#corpo-tabela tr');

    const marcarELimpar = (linha) => {
        const cb = linha.querySelector('input[type="checkbox"]');
        if (cb) {
            cb.checked = true;
            marcarItem(parseInt(cb.id.split('-')[1]), true);
            this.value = '';
            document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
                if (!tr.querySelector('.estado-vazio')) tr.style.display = '';
            });
            setTimeout(() => linha.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            return true;
        }
        return false;
    };

    for (let linha of linhas) {
        if (linha.querySelector('.col-codigo')?.innerText.trim() === termoBusca) {
            marcarELimpar(linha);
            return;
        }
    }

    try {
        const resposta = await fetch(`${window.location.origin}/buscar-produto/${termoBusca}`);
        if (resposta.ok) {
            const produto = await resposta.json();
            const codigoReal = produto[0].ITEM_ESTOQUE_PUB.toString().trim();
            let achou = false;
            for (let linha of linhas) {
                if (linha.querySelector('.col-codigo')?.innerText.trim() === codigoReal) {
                    achou = marcarELimpar(linha);
                    break;
                }
            }
            if (!achou) {
                alert(`Produto [${produto[0].DES_ITEM_ESTOQUE}] fora do romaneio!`);
                this.value = '';
                filtrarTabela();
            }
        } else {
            alert('Código não encontrado!');
            this.value = '';
            filtrarTabela();
        }
    } catch (err) {
        alert('Código não encontrado no romaneio!');
        this.value = '';
        filtrarTabela();
    }
});

document.getElementById('busca-codigo').addEventListener('input', function () {
    const valor = this.value.trim();
    if (valor === '') {
        document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
            if (!tr.querySelector('.estado-vazio')) {
                tr.style.display = (mostrarApenasPendentes && tr.classList.contains('linha-conferida')) ? 'none' : '';
            }
        });
        return;
    }
    const ehEAN = /^\d{8,}$/.test(valor);
    if (ehEAN) dispararBusca(this, valor);
});

async function dispararBusca(input, termoBusca) {
    const linhas = document.querySelectorAll('#corpo-tabela tr');
    const termo = termoBusca.trim();
    if (!termo) return;

    let linhaEncontrada = null;

    for (let linha of linhas) {
        if (linha.querySelector('.col-codigo')?.innerText.trim() === termo) {
            linhaEncontrada = linha;
            break;
        }
    }

    if (!linhaEncontrada) {
        try {
            const res = await fetch(`${window.location.origin}/buscar-produto/${termo}`);
            if (res.ok) {
                const produtos = await res.json();
                const codigoReal = produtos[0].ITEM_ESTOQUE_PUB.toString().trim();
                for (let linha of linhas) {
                    if (linha.querySelector('.col-codigo')?.innerText.trim() === codigoReal) {
                        linhaEncontrada = linha;
                        break;
                    }
                }
            }
        } catch (e) { console.log('Erro banco'); }
    }

    if (linhaEncontrada) {
        const idx = linhaEncontrada.id.replace('linha-', '');
        const spanCont = document.getElementById(`cont-item-${idx}`);
        const totalMax = parseInt(spanCont.parentElement.textContent.split('/')[1]);
        incrementarItem(idx, totalMax);
        input.value = '';
        linhaEncontrada.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (navigator.vibrate) navigator.vibrate(100);
    } else {
        alert('Produto não está neste romaneio!');
        input.value = '';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VISIBILIDADE / ALTERNAR PENDENTES
// ─────────────────────────────────────────────────────────────────────────────

function alternarVisibilidade() {
    mostrarApenasPendentes = !mostrarApenasPendentes;
    const btn = document.getElementById('btn-ocultar');
    if (btn) btn.textContent = mostrarApenasPendentes ? 'Mostrar Todos' : 'Ocultar Conferidos';
    filtrarTabela();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTADORES
// ─────────────────────────────────────────────────────────────────────────────

function atualizarContador() {
    const elementoContador = document.getElementById('secao-contador');
    document.getElementById('contagem-conferidos').textContent = conferidos;
    document.getElementById('contagem-total').textContent = totalItens;

    if (conferidos === 0) {
        elementoContador.style.background = '#fff0f0';
        elementoContador.style.color = '#CC0000';
        elementoContador.style.borderColor = '#CC0000';
    } else if (conferidos === totalItens && totalItens > 0) {
        elementoContador.style.background = '#edf7f0';
        elementoContador.style.color = '#2d7a4a';
        elementoContador.style.borderColor = '#2d7a4a';
    } else {
        elementoContador.style.background = '#fff9eb';
        elementoContador.style.color = '#f39c12';
        elementoContador.style.borderColor = '#f39c12';
    }
}

function atualizarContadorGeral() {
    const totalFinalizados = document.querySelectorAll('.linha-conferida').length;
    document.getElementById('contagem-conferidos').textContent = totalFinalizados;
    document.getElementById('contagem-total').textContent = totalItens;

    const el = document.getElementById('secao-contador');
    if (!el) return;
    if (totalFinalizados === 0) {
        el.style.background = '#fff0f0'; el.style.color = '#CC0000';
    } else if (totalFinalizados === totalItens && totalItens > 0) {
        el.style.background = '#edf7f0'; el.style.color = '#2d7a4a';
    } else {
        el.style.background = '#fff9eb'; el.style.color = '#f39c12';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRICO
// ─────────────────────────────────────────────────────────────────────────────

function salvarNoHistorico() {
    if (typeof totalItens === 'undefined' || totalItens === 0) return;

    const elementoInfo = document.getElementById('info-romaneio');
    const nomeRomaneio = (elementoInfo && elementoInfo.textContent) ? elementoInfo.textContent : 'Documento Avulso';
    const dataHora = new Date().toLocaleString('pt-BR');

    const itensAtuaisSnapshot = [];
    document.querySelectorAll('#corpo-tabela tr').forEach((linha) => {
        if (linha.querySelector('.estado-vazio')) return;
        itensAtuaisSnapshot.push({
            locacao: linha.querySelector('.col-locacao')?.textContent || '',
            qtd: linha.querySelector('.col-qtd')?.textContent || '0',
            codigo: linha.querySelector('.col-codigo')?.textContent || '',
            descricao: linha.querySelector('.col-descricao')?.textContent || '',
            conferido: linha.classList.contains('linha-conferida')
        });
    });

    const registroNovo = {
        nome: nomeRomaneio,
        data: dataHora,
        total: totalItens,
        concluidos: conferidos,
        produtos: itensAtuaisSnapshot,
        cabecalho: { ...cabecalhoAtual }  // usa o objeto global — sempre correto
    };

    let historico = JSON.parse(localStorage.getItem('historico_hontec') || '[]');
    if (historico.length > 0 && historico[0].nome === nomeRomaneio) historico.shift();
    historico.unshift(registroNovo);
    if (historico.length > 8) historico = historico.slice(0, 8);
    localStorage.setItem('historico_hontec', JSON.stringify(historico));
    console.log('Histórico atualizado com sucesso (Limite 8).');
    atualizarDadosDoHistorico();
}

function mostrarHistorico() {
    const painel = document.getElementById('secao-historico');
    if (!painel) return;
    if (painel.style.display === 'block') {
        painel.style.display = 'none';
    } else {
        atualizarDadosDoHistorico();
        painel.style.display = 'block';
    }
}

function atualizarDadosDoHistorico() {
    const lista = document.getElementById('lista-do-historico');
    if (!lista) return;

    const dados = JSON.parse(localStorage.getItem('historico_hontec') || '[]');
    if (dados.length === 0) {
        lista.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>Nenhum romaneio salvo.</p>";
    } else {
        lista.innerHTML = dados.map((item, index) => {
            let corStatus = item.concluidos === 0 ? '#CC0000' : (item.concluidos === item.total ? '#2d7a4a' : '#f39c12');
            return `
                <div onclick="carregarDoHistorico(${index})" style="padding:10px; border-bottom:1px solid #eee; font-size:12px; cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                    <strong>${item.nome}</strong><br>
                    <span style="color:#888; font-size:10px;">${item.data}</span><br>
                    <span style="color:${corStatus}; font-weight: 600;">Status: ${item.concluidos}/${item.total} OK</span>
                </div>
            `;
        }).join('');
    }
}

function carregarDoHistorico(indice) {
    const dados = JSON.parse(localStorage.getItem('historico_hontec') || '[]');
    const rom = dados[indice];
    if (!rom || !rom.produtos) {
        alert('Não há dados de produtos salvos para este romaneio.');
        return;
    }

    // Padronização dos dados para garantir que o contador geral funcione
    totalItens = rom.total;
    // Verifica se o item atingiu o total usando o campo valorAtual
    conferidos = rom.produtos.filter(p => (p.valorAtual || 0) >= parseInt(p.qtd)).length;
    itensAtuais = rom.produtos;
    romaneioIdAtivo = rom.cabecalho?.nRomaneio || null;

    document.getElementById('info-romaneio').style.display = 'block';
    document.getElementById('info-romaneio').textContent = rom.nome;
    document.getElementById('secao-contador').style.display = 'block';
    document.getElementById('botao-limpar').style.display = 'inline-block';

    if (rom.cabecalho) renderizarCabecalho(rom.cabecalho);

    const corpoTabela = document.getElementById('corpo-tabela');
    corpoTabela.innerHTML = '';

    rom.produtos.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.id = `linha-${idx}`;
        
        const valorTotal = parseInt(item.qtd);
        // Recupera o valorAtual salvo. Se não existir (romaneio antigo), usa a lógica do check.
        const valorAtual = item.valorAtual !== undefined ? item.valorAtual : (item.conferido ? valorTotal : 0);
        
        const classeDestaque = valorTotal > 1 ? 'qtd-multipla' : '';

        tr.setAttribute('onclick', `incrementarItem(${idx}, ${valorTotal})`);
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td class="col-locacao">${item.locacao}</td>
          <td class="col-qtd">
            <span class="${classeDestaque}">
                <span id="cont-item-${idx}" data-atual="${valorAtual}">${valorAtual}</span> / ${valorTotal}
            </span>
          </td>
          <td class="col-codigo">${item.codigo}</td>
          <td class="col-descricao">${item.descricao}</td>
          <td class="col-check" style="text-align: center;">
            <div id="status-quadrado-${idx}" class="quadrado-status"></div>
            <input type="checkbox" id="chk-${idx}" ${valorAtual >= valorTotal ? 'checked' : ''} style="display:none">
          </td>
        `;
        corpoTabela.appendChild(tr);
        
        // Esta função vai garantir que o amarelo apareça se o valor for (1 / 2)
        atualizarVisualItem(idx, valorAtual, valorTotal);
    });

    atualizarContadorGeral();
    document.getElementById('secao-historico').style.display = 'none';
    if (typeof filtrarTabela === 'function') filtrarTabela();
}


// ─────────────────────────────────────────────────────────────────────────────
// COLAR DO APOLLO
// ─────────────────────────────────────────────────────────────────────────────

async function colarDoApollo() {
    if (typeof totalItens !== 'undefined' && totalItens > 0) salvarNoHistorico();

    const btn = document.querySelector('button[onclick="colarDoApollo()"]');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Aguarde...';

    try {
        const resposta = await fetch('http://localhost:3000/copiar-romaneio');
        const dados = await resposta.json();

        if (!resposta.ok) throw new Error(dados.erro || 'Erro desconhecido');
        if (!dados.conteudo || dados.conteudo.trim() === '') {
            alert('O Bloco de Notas está vazio!');
            btn.disabled = false;
            btn.textContent = textoOriginal;
            return;
        }

        processarTexto(dados.conteudo);
        document.getElementById('legenda-arquivo').textContent = 'Copiado do Bloco de Notas';
        btn.textContent = '✔ Copiado!';
        btn.style.background = '#2d7a4a';
        btn.style.color = '#fff';
        btn.style.borderColor = '#2d7a4a';

        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = textoOriginal;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 2000);

    } catch (err) {
        alert('Erro: servidor offline. Rode o server.js primeiro!');
        btn.disabled = false;
        btn.textContent = textoOriginal;
        console.error('Erro ao copiar romaneio:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIMPAR TABELA
// ─────────────────────────────────────────────────────────────────────────────

function limparTabela() {
    try { salvarNoHistorico(); } catch (e) { console.log('Falha ao salvar...'); }

    const input = document.getElementById('entrada-arquivo');
    if (input) input.value = '';
    document.getElementById('legenda-arquivo').textContent = 'Insira o .txt do Apollo';
    document.getElementById('info-romaneio').style.display = 'none';
    document.getElementById('secao-contador').style.display = 'none';
    document.getElementById('botao-limpar').style.display = 'none';

    totalItens = 0;
    conferidos = 0;
    itensAtuais = [];
    romaneioIdAtivo = null;
    ultimoHashChecks = '';

    const corpoTabela = document.getElementById('corpo-tabela');
    if (corpoTabela) {
        corpoTabela.innerHTML = `<tr><td colspan="5" class="estado-vazio"><p>Nenhum arquivo carregado</p></td></tr>`;
    }

    const painel = document.getElementById('painel-cabecalho');
    if (painel) {
        painel.style.display = 'none';
        painel.innerHTML = `<div class="cabecalho-topo"></div><div class="cabecalho-corpo" id="cabecalho-corpo"></div>`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARCAR ITEM (usado pelo Enter/busca quando já era checkbox simples)
// ─────────────────────────────────────────────────────────────────────────────

function marcarItem(idx, checado, manual = true) {
    const linha = document.getElementById(`linha-${idx}`);
    const contadorItem = document.getElementById(`cont-item-${idx}`);
    if (!linha || !contadorItem) return;

    const totalDoItem = linha.querySelector('.col-qtd span').textContent.split('/')[1];

    if (checado) {
        linha.classList.add('linha-conferida');
        contadorItem.textContent = totalDoItem;
    } else {
        linha.classList.remove('linha-conferida');
        contadorItem.textContent = '0';
    }

    atualizarContador();
    if (manual) sincronizarClique();
}

// ─────────────────────────────────────────────────────────────────────────────
// SALVAR NO BANCO / DOWNLOAD TXT
// ─────────────────────────────────────────────────────────────────────────────

async function salvarTabelaEmArquivo() {
    salvarNoHistorico();

    const linhas = document.querySelectorAll('#corpo-tabela tr');
    if (linhas.length === 0 || document.querySelector('.estado-vazio')) {
        alert('Carregue um romaneio primeiro!');
        return;
    }

    let totalItensLocal = 0;
    let conferidosLocal = 0;
    const itensParaBanco = [];

    linhas.forEach(linha => {
        if (!linha.querySelector('.estado-vazio')) {
            // Pega o span do contador unitário
            const spanContador = linha.querySelector('[id^="cont-item-"]');
            // Extrai o valor atual (ex: o "1" de "1/2")
            const valorAtual = spanContador ? parseInt(spanContador.getAttribute('data-atual')) : 0;

            // Pega o valor total da quantidade (o que vem depois da barra)
            const textoQtdCompleto = linha.querySelector('.col-qtd')?.innerText || '0 / 0';
            const valorTotal = parseInt(textoQtdCompleto.split('/')[1]) || 1;

            const isChecked = linha.querySelector('input[type="checkbox"]')?.checked || false;

            totalItensLocal++;
            if (isChecked) conferidosLocal++;

            itensParaBanco.push({
                locacao: linha.querySelector('.col-locacao')?.innerText.trim() || '',
                qtd: valorTotal, // Salva apenas o número total (ex: 2)
                valorAtual: valorAtual, // Salva o progresso (ex: 1)
                codigo: linha.querySelector('.col-codigo')?.innerText.trim() || '',
                descricao: linha.querySelector('.col-descricao')?.innerText.trim() || '',
                conferido: isChecked
            });
        }
    });

    const cab = cabecalhoAtual;
    const numeroLimpo = cab.nRomaneio.replace(/\D/g, '') || Date.now().toString();

    let txt = `                       | REEMISSÃO |\n`;
    const topoInfo = `Nº: ${numeroLimpo} - ${cab.dataHora} -+`;
    txt += `+-----------------ROMANEIO DE RETIRADA ${topoInfo.padStart(55)}\n`;
    txt += `| REQ.: ${cab.requisitante}`.padEnd(42) + `CONTATO:   ${cab.contato}`.padEnd(20) + `OS:      ${cab.os}`.padEnd(15) + `|\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| CLIENTE:     ${cab.cliente}`.padEnd(55) + `PLACA:  ${cab.placa}`.padEnd(22) + `|\n`;
    txt += `| MODELO: ${cab.modelo.padEnd(68)}|\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| --LOCACAO--     --QUANT--  --ITEM--  --DESCRICAO--                --CHECK--  |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;

    linhas.forEach(linha => {
        if (linha.querySelector('.estado-vazio')) return;
        const loc = (linha.querySelector('.col-locacao')?.innerText.trim() || '').padEnd(16);

        // No TXT para impressão, pegamos o progresso atual para mostrar (ex: 1.00 ou 2.00)
        const spanContador = linha.querySelector('[id^="cont-item-"]');
        const vAtual = spanContador ? spanContador.getAttribute('data-atual') : "0";
        const qtd = parseFloat(vAtual).toFixed(2).replace('.', ',').padStart(5);

        const cod = (linha.querySelector('.col-codigo')?.innerText.trim() || '').padStart(6);
        const desc = linha.querySelector('.col-descricao')?.innerText.trim() || '';
        const descF = (desc.length > 33 ? desc.substring(0, 30) + '...' : desc).padEnd(33);

        // No TXT impresso, só ganha [X] se estiver 100% conferido
        const chk = linha.classList.contains('linha-conferida') ? '[X]' : '[ ]';

        txt += `| ${loc}  ${qtd}  ${cod}      ${descF}  ${chk.padStart(5)} |\n`;
        txt += `+------------------------------------------------------------------------------+\n`;
    });

    txt += `\n| SEPARADOR:                 AUTORIZANTE:                RECEBIDO:             | \n`;
    txt += `+------------------------------------------------------------------------------+ \n`;

    const dadosSalvar = {
        id: numeroLimpo,
        nome: `Romaneio ${numeroLimpo}`,
        data: new Date().toLocaleString('pt-BR'),
        cliente: cab.cliente,
        total_itens: totalItensLocal,
        conferidos: conferidosLocal,
        itens: itensParaBanco,
        txt_formatado: txt,
        status: (conferidosLocal === totalItensLocal && totalItensLocal > 0) ? 'FECHADO' : 'ABERTO'
    };

    try {
        const resposta = await fetch('http://localhost:3000/salvar-romaneio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosSalvar)
        });
        if (resposta.ok) {
            alert(`✔ Romaneio ${numeroLimpo} salvo! (${conferidosLocal}/${totalItensLocal} conferidos)`);
            limparTabela();
            const btnTxt = document.getElementById('botao-baixar-txt');
            if (btnTxt) {
                btnTxt.style.display = 'inline-block';
                btnTxt.dataset.id = numeroLimpo;
                btnTxt.dataset.nome = `r${numeroLimpo}.txt`;
            }
        } else {
            throw new Error('Erro ao salvar no servidor');
        }
    } catch (err) {
        alert('❌ Erro ao salvar. Verifique se o servidor está rodando na porta 3000.');
        console.error(err);
    }
}


function baixarTxt() {
    const linhas = document.querySelectorAll('#corpo-tabela tr');
    if (linhas.length === 0 || document.querySelector('.estado-vazio')) {
        alert('Carregue um romaneio primeiro!');
        return;
    }

    const cab = cabecalhoAtual;
    const numeroLimpo = cab.nRomaneio.replace(/\D/g, '');
    const nomeArquivo = `r${numeroLimpo}.txt`;

    let txt = `                                                                | REEMISSÃO |\n`;
    txt += `+-----------------     ROMANEIO DE RETIRADA    Nº: ${numeroLimpo.padEnd(5)} - ${cab.dataHora.padEnd(16)} +\n`;
    txt += `| REQ.: ${cab.requisitante.padEnd(35)} CONTATO: ${cab.contato.padEnd(15)} OS: ${cab.os.padEnd(10)} |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| CLIENTE: ${cab.cliente.padEnd(48)} PLACA: ${cab.placa.padEnd(12)} |\n`;
    txt += `| MODELO: ${cab.modelo.padEnd(68)} |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| --LOCACAO--     --QUANT--  --ITEM--  --DESCRICAO--                --CHECK--  |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;

    linhas.forEach(linha => {
        if (linha.querySelector('.estado-vazio')) return;
        const loc = (linha.querySelector('.col-locacao')?.innerText.trim() || '').padEnd(16);
        const qtd = (linha.querySelector('.col-qtd')?.innerText.trim() || '0').padStart(7);
        const cod = (linha.querySelector('.col-codigo')?.innerText.trim() || '').padStart(8);
        const desc = (linha.querySelector('.col-descricao')?.innerText.trim() || '');
        const descF = (desc.length > 33 ? desc.substring(0, 30) + '...' : desc).padEnd(33);
        const chk = linha.querySelector('input[type="checkbox"]')?.checked ? '[X]' : '[ ]';
        txt += `| ${loc}  ${qtd}  ${cod}      ${descF}  ${chk.padStart(5)} |\n`;
        txt += `+------------------------------------------------------------------------------+\n`;
    });
    txt += `\n| SEPARADOR:                 AUTORIZANTE:                RECEBIDO:             | \n`;
    txt += `+------------------------------------------------------------------------------+ \n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function abrirHistoricoRapido() {
    let num = prompt("Digite o número do Romaneio:");
    if (!num) return;

    // Remove QUALQUER coisa que não seja número (incluindo espaços e letras)
    const numeroLimpo = num.replace(/\D/g, '').trim();

    try {
        // Usa template literal com crase `` para garantir a URL correta
        const resposta = await fetch(`${window.location.origin}/romaneio/${numeroLimpo}`);

        if (resposta.status === 404) {
            alert(`O Romaneio ${numeroLimpo} não existe no banco.\nLembre-se de clicar em 'Salvar' no PC primeiro!`);
            return;
        }

        const dados = await resposta.json();

        // Aqui você chama a função que já corrigimos para montar a tabela
        sincronizarComBanco(numeroLimpo);

    } catch (err) {
        console.error("Erro na requisição:", err);
        alert("Erro ao conectar com o servidor.");
    }
}


function aplicarMudancaLocal(idx, valor, total) {
    const linha = document.getElementById(`linha-${idx}`);
    if (mostrarApenasPendentes && valor >= total) {
        setTimeout(() => { if (mostrarApenasPendentes) linha.style.display = 'none'; }, 300);
    } else {
        linha.style.display = '';
    }
    atualizarContadorGeral();
}