let totalItens = 0;
let conferidos = 0;

function carregarArquivo(input) {

    if (typeof totalItens !== 'undefined' && totalItens > 0) {
        salvarNoHistorico();
    }


    const arquivo = input.files[0];

    if (!arquivo) return;

    document.getElementById('legenda-arquivo').textContent = arquivo.name;

    const leitor = new FileReader();
    leitor.onload = function (e) {
        const texto = e.target.result;
        processarTexto(texto);
    };

    leitor.readAsText(arquivo, 'ISO-8859-1');
}

function processarTexto(texto) {
    const linhas = texto.split('\n');

    // Captura robusta usando Regex
    const nRomaneio = texto.match(/Nº:\s+(\d+)/)?.[1] || "---";
    const dataHora = texto.match(/(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2})/)?.[1] || "---";
    const requisitante = texto.match(/REQ\.:\s+(.*?)\s+CONTATO/)?.[1]?.trim() || "---";
    const contato = texto.match(/CONTATO:\s+(\d+)/)?.[1] || "---";
    const os = texto.match(/OS:\s*(\d*)/)?.[1] || "---";
    const cliente = texto.match(/CLIENTE:\s+(\d+\s+.*?)\s+PLACA/)?.[1]?.trim() || "---";
    const placa = texto.match(/PLACA:\s*(.*?)\s*\|/)?.[1]?.trim() || "---";
    const modelo = texto.match(/MODELO:\s*(.*?)\s*\|/)?.[1]?.trim() || "---";

    const painel = document.getElementById('painel-cabecalho');
    painel.style.display = 'block';

    // Montando o HTML com todos os dados
    painel.innerHTML = `
        <div class="cabecalho-topo">
            <span>Romaneio Nº: ${nRomaneio}</span>
            <span>Data: ${dataHora}</span>
        </div>
        <div class="cabecalho-corpo" id="cabecalho-corpo">
            <div class="cabecalho-item"><span>REQ:</span> <strong>${requisitante}</strong></div>
            <div class="cabecalho-item"><span>CONTATO:</span> <strong>${contato}</strong></div>
            <div class="cabecalho-item"><span>OS:</span> <strong>${os}</strong></div>
            <div class="cabecalho-item"><span>PLACA:</span> <strong>${placa}</strong></div>
            <div class="cabecalho-item item-full"><span>CLIENTE:</span> <strong>${cliente}</strong></div>
            <div class="cabecalho-item item-full"><span>MODELO:</span> <strong>${modelo}</strong></div>
        </div>
    `;


    const itens = [];

    let infoRomaneio = '';
    for (let linha of linhas) {
        if (linha.includes('ROMANEIO DE RETIRADA')) {
            const match = linha.match(/N[^\d]*(\d+).*?(\d{2}\/\d{2}\/\d{4})/);
            if (match) infoRomaneio = `Romaneio N°: ${match[1]}  |  Data: ${match[2]}`;
            break;
        }
    }


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
        corpoTabela.innerHTML = `
      <tr><td colspan="5" class="estado-vazio"><p>Nenhum item encontrado no arquivo</p></td></tr>
    `;
        return;
    }

    totalItens = itens.length;
    conferidos = 0;

    if (infoRomaneio) {
        const elementoInfo = document.getElementById('info-romaneio');
        elementoInfo.style.display = 'block';
        elementoInfo.textContent = infoRomaneio;
    }

    document.getElementById('secao-contador').style.display = 'block';
    document.getElementById('botao-limpar').style.display = 'inline-block';
    atualizarContador();


    corpoTabela.innerHTML = '';

    itens.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.id = `linha-${idx}`;

        const valorQtd = parseFloat(item.qtd);
        const classeDestaque = valorQtd > 1 ? 'qtd-multipla' : '';

        tr.innerHTML = `
      <td class="col-locacao">${item.locacao}</td>
      <td class="col-qtd"><span class="${classeDestaque}">${valorQtd.toFixed(0)}</span></td>
      <td class="col-codigo">${item.codigo}</td>
      <td class="col-descricao">${item.descricao}</td>
      <td class="col-check">
        <div class="caixa-selecao">
          <input type="checkbox" id="chk-${idx}" onchange="marcarItem(${idx}, this.checked)">
        </div>
      </td>
    `;
        corpoTabela.appendChild(tr);
    });
}

function marcarItem(idx, checado) {
    const linha = document.getElementById(`linha-${idx}`);
    if (checado) {
        linha.classList.add('linha-conferida');
        conferidos++;
    } else {
        linha.classList.remove('linha-conferida');
        conferidos--;
    }
    atualizarContador();
}

function atualizarContador() {
    document.getElementById('contagem-conferidos').textContent = conferidos;
    document.getElementById('contagem-total').textContent = totalItens;
}


let mostrarApenasPendentes = false;

async function filtrarTabela() {
    const busca = document.getElementById('busca-codigo').value.toLowerCase().trim();
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    if (busca === "") {
        linhas.forEach(linha => {
            if (linha.querySelector('.estado-vazio')) return;
            linha.style.display = (mostrarApenasPendentes && linha.classList.contains('linha-conferida')) ? 'none' : '';
        });
        return;
    }

    const buscaEhNumero = /^\d+$/.test(busca);
    let codigoTraduzido = busca;

    // Se for um EAN (Código de barras longo), tenta traduzir pelo banco
    if (busca.length > 8 && buscaEhNumero) {
        try {
            const resposta = await fetch(`http://localhost:3000/buscar-produto/${busca}`);
            if (resposta.ok) {
                const produto = await resposta.json();
                codigoTraduzido = produto.ITEM_ESTOQUE_PUB.toString().toLowerCase().trim();
            }
        } catch (err) { console.error("Erro no banco:", err); }
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

document.getElementById('busca-codigo').addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const termoBusca = this.value.trim();
        if (termoBusca === "") return;

        try {
            const resposta = await fetch(`http://localhost:3000/buscar-produto/${termoBusca}`);

            if (resposta.ok) {
                const produto = await resposta.json();
                const codigoReal = produto.ITEM_ESTOQUE_PUB.toString().trim();

                let achou = false;
                const linhas = document.querySelectorAll('#corpo-tabela tr');

                for (let linha of linhas) {
                    const codTabela = linha.querySelector('.col-codigo')?.innerText.trim();
                    if (codTabela === codigoReal) {
                        const cb = linha.querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.checked = true;
                            marcarItem(parseInt(cb.id.split('-')[1]), true);


                            this.value = '';
                            filtrarTabela();

                            linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            achou = true;
                            break;
                        }
                    }
                }

                if (!achou) {
                    alert(`Produto [${produto.DES_ITEM_ESTOQUE}] fora do romaneio!`);
                    this.value = '';
                    filtrarTabela();
                }
            } else {
                alert("Código não cadastrado!");
                this.value = '';
                filtrarTabela();
            }
        } catch (err) {
            console.error(err);
        }
    }
});


function alternarVisibilidade() {
    mostrarApenasPendentes = !mostrarApenasPendentes;
    const btn = document.getElementById('btn-ocultar');
    btn.textContent = mostrarApenasPendentes ? "Mostrar Todos" : "Ocultar Conferidos";
    btn.style.background = mostrarApenasPendentes ? "#00009C" : "#fff";
    btn.style.color = mostrarApenasPendentes ? "#fff" : "#00009C";
    filtrarTabela();
}

function salvarNoHistorico() {
    if (typeof totalItens === 'undefined' || totalItens === 0) return;

    const elementoInfo = document.getElementById('info-romaneio');
    const nomeRomaneio = (elementoInfo && elementoInfo.textContent) ? elementoInfo.textContent : "Documento Avulso";
    const dataHora = new Date().toLocaleString('pt-BR');

    // 1. CAPTURA OS ITENS DA TABELA
    const itensAtuais = [];
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    linhas.forEach((linha) => {
        if (linha.querySelector('.estado-vazio')) return;

        const locacao = linha.querySelector('.col-locacao')?.textContent || '';
        const qtd = linha.querySelector('.col-qtd')?.textContent || '0';
        const codigo = linha.querySelector('.col-codigo')?.textContent || '';
        const descricao = linha.querySelector('.col-descricao')?.textContent || '';
        const conferido = linha.classList.contains('linha-conferida');

        itensAtuais.push({ locacao, qtd, codigo, descricao, conferido });
    });

    // 2. CAPTURA OS DADOS DO CABEÇALHO (MÉTODO SEGURO)
    const cabecalhoCorpo = document.getElementById('cabecalho-corpo');
    let dadosCabecalho = null;

    if (cabecalhoCorpo) {
        const strongs = cabecalhoCorpo.querySelectorAll('strong');

        // Pegamos as tags de texto lá do topo do painel azul
        const spansTopo = document.querySelectorAll('.cabecalho-topo span');
        let nRomaneio = "---";
        let dataHora = "---";

        // Se existirem as duas informações no topo, pegamos limpando o texto
        if (spansTopo.length >= 2) {
            nRomaneio = spansTopo[0].innerText.replace('Romaneio Nº:', '').trim();
            dataHora = spansTopo[1].innerText.replace('Data:', '').trim();
        }

        dadosCabecalho = {
            nRomaneio: nRomaneio,
            dataHora: dataHora,
            requisitante: strongs[0]?.innerText || "---",
            contato: strongs[1]?.innerText || "---",
            os: strongs[2]?.innerText || "---",
            placa: strongs[3]?.innerText || "---",
            cliente: strongs[4]?.innerText || "---",
            modelo: strongs[5]?.innerText || "---"
        };
    }

    const registroNovo = {
        nome: nomeRomaneio,
        data: dataHora,
        total: totalItens,
        concluidos: conferidos,
        produtos: itensAtuais,
        cabecalho: dadosCabecalho
    };

    let historico = JSON.parse(localStorage.getItem('historico_hontec') || '[]');

    if (historico.length > 0 && historico[0].nome === nomeRomaneio) {
        historico.shift();
    }

    historico.unshift(registroNovo);

    if (historico.length > 8) {
        historico = historico.slice(0, 8);
    }

    localStorage.setItem('historico_hontec', JSON.stringify(historico));
    console.log("Histórico atualizado com sucesso (Limite 8).");
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
            let corStatus;
            if (item.concluidos === 0) {
                corStatus = '#CC0000';
            } else if (item.concluidos === item.total) {
                corStatus = '#2d7a4a';
            } else {
                corStatus = '#f39c12';
            }

            // Adicionado cursor:pointer e o evento onclick apontando para a função acima
            return `
                <div onclick="carregarDoHistorico(${index})" style="padding:10px; border-bottom:1px solid #eee; font-size:12px; cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                    <strong>${item.nome}</strong><br>
                    <span style="color:#888; font-size:10px;">${item.data}</span><br>
                    <span style="color:${corStatus}; font-weight: 600;">
                        Status: ${item.concluidos}/${item.total} OK
                    </span>
                </div>
            `;
        }).join('');
    }
}
async function colarDoApollo() {
    if (typeof totalItens !== 'undefined' && totalItens > 0) {
        salvarNoHistorico();
    }

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
        document.getElementById('legenda-arquivo').textContent = "Copiado do Bloco de Notas";

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


function atualizarContador() {
    const elementoContador = document.getElementById('secao-contador');
    document.getElementById('contagem-conferidos').textContent = conferidos;
    document.getElementById('contagem-total').textContent = totalItens;

    // Lógica de 3 cores para o fundo da barra
    if (conferidos === 0) {
        elementoContador.style.background = "#fff0f0"; // Fundo Vermelho claro
        elementoContador.style.color = "#CC0000";      // Texto Vermelho
        elementoContador.style.borderColor = "#CC0000";
    } else if (conferidos === totalItens && totalItens > 0) {
        elementoContador.style.background = "#edf7f0"; // Fundo Verde claro
        elementoContador.style.color = "#2d7a4a";      // Texto Verde
        elementoContador.style.borderColor = "#2d7a4a";
    } else {
        elementoContador.style.background = "#fff9eb"; // Fundo Laranja claro
        elementoContador.style.color = "#f39c12";      // Texto Laranja
        elementoContador.style.borderColor = "#f39c12";
    }
}

function carregarDoHistorico(indice) {
    const dados = JSON.parse(localStorage.getItem('historico_hontec') || '[]');
    const romaneioSelecionado = dados[indice];

    if (!romaneioSelecionado || !romaneioSelecionado.produtos) {
        alert("Não há dados de produtos salvos para este romaneio.");
        return;
    }

    totalItens = romaneioSelecionado.total;
    conferidos = romaneioSelecionado.concluidos;

    const elementoInfo = document.getElementById('info-romaneio');
    elementoInfo.style.display = 'block';
    elementoInfo.textContent = romaneioSelecionado.nome;

    document.getElementById('secao-contador').style.display = 'block';
    document.getElementById('botao-limpar').style.display = 'inline-block';
    atualizarContador();

    // 4. RESTAURANDO COM AS CAIXINHAS IDENTIFICADAS
    const painel = document.getElementById('painel-cabecalho');
    if (romaneioSelecionado.cabecalho && painel) {
        painel.style.display = 'block';
        const cab = romaneioSelecionado.cabecalho;

        painel.innerHTML = `
            <div class="cabecalho-topo">
                <span id="cab-num-romaneio">${cab.nRomaneio}</span>
                <span id="cab-data-romaneio"> ${cab.dataHora}</span>
            </div>
            <div class="cabecalho-corpo" id="cabecalho-corpo">
                <div class="cabecalho-item"><span>REQ:</span> <strong>${cab.requisitante}</strong></div>
                <div class="cabecalho-item"><span>CONTATO:</span> <strong>${cab.contato}</strong></div>
                <div class="cabecalho-item"><span>OS:</span> <strong>${cab.os}</strong></div>
                <div class="cabecalho-item"><span>PLACA:</span> <strong>${cab.placa}</strong></div>
                <div class="cabecalho-item item-full"><span>CLIENTE:</span> <strong>${cab.cliente}</strong></div>
                <div class="cabecalho-item item-full"><span>MODELO:</span> <strong>${cab.modelo}</strong></div>
            </div>
        `;
    } else if (painel) {
        painel.style.display = 'none';
    }

    const corpoTabela = document.getElementById('corpo-tabela');
    corpoTabela.innerHTML = '';

    romaneioSelecionado.produtos.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.id = `linha-${idx}`;

        const valorQtd = parseFloat(item.qtd);
        const classeDestaque = valorQtd > 1 ? 'qtd-multipla' : '';

        if (item.conferido) {
            tr.classList.add('linha-conferida');
        }

        tr.innerHTML = `
          <td class="col-locacao">${item.locacao}</td>
          <td class="col-qtd"><span class="${classeDestaque}">${valorQtd.toFixed(0)}</span></td>
          <td class="col-codigo">${item.codigo}</td>
          <td class="col-descricao">${item.descricao}</td>
          <td class="col-check">
            <div class="caixa-selecao">
              <input type="checkbox" id="chk-${idx}" ${item.conferido ? 'checked' : ''} onchange="marcarItem(${idx}, this.checked)">
            </div>
          </td>
        `;
        corpoTabela.appendChild(tr);
    });

    document.getElementById('secao-historico').style.display = 'none';
}

function limparTabela() {
    try { salvarNoHistorico(); }
    catch (erro) {
        console.log("Falha ao salvar, mas limpando assim mesmo...");
    } const input = document.getElementById('entrada-arquivo');
    if (input) input.value = "";
    document.getElementById('legenda-arquivo').textContent = "Insira o .txt do Apollo";
    document.getElementById('info-romaneio').style.display = 'none';
    document.getElementById('secao-contador').style.display = 'none';
    document.getElementById('botao-limpar').style.display = 'none';
    totalItens = 0; conferidos = 0;
    const corpoTabela = document.getElementById('corpo-tabela');
    if (corpoTabela) {
        corpoTabela.innerHTML = ` <tr> <td colspan="5" class="estado-vazio"> 
             <p>Nenhum arquivo carregado</p> </td> </tr> `;
    }
    const painelcabecalho = document.getElementById('painel-cabecalho');
    if (painelcabecalho) {
        painelcabecalho.innerHTML = `
         <div class="cabecalho-topo"> </div> 
         <div class="cabecalho-corpo" id="cabecalho-corpo"></div> 
         `;
    }
}


async function salvarTabelaEmArquivo() {
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    if (linhas.length === 0 || document.querySelector('.estado-vazio')) {
        alert("Carregue um romaneio primeiro!");
        return;
    }

    // ── Captura itens da tabela ──────────────────────────────
    const itensParaBanco = [];
    linhas.forEach(linha => {
        if (!linha.querySelector('.estado-vazio')) {
            itensParaBanco.push({
                locacao:   linha.querySelector('.col-locacao')?.innerText.trim() || '',
                qtd:       linha.querySelector('.col-qtd')?.innerText.trim() || '0',
                codigo:    linha.querySelector('.col-codigo')?.innerText.trim() || '',
                descricao: linha.querySelector('.col-descricao')?.innerText.trim() || '',
                conferido: linha.querySelector('input[type="checkbox"]')?.checked || false
            });
        }
    });

    // ── Captura cabeçalho ────────────────────────────────────
    const spansTopo    = document.querySelectorAll('.cabecalho-topo span');
    const strongs      = document.querySelectorAll('#cabecalho-corpo strong');
    const textoRom     = spansTopo[0]?.innerText || '';
    const nRomaneio    = textoRom.replace(/Romaneio\s*Nº\s*:/i, '').trim() || '0';
    const dataRom      = spansTopo[1]?.innerText.replace(/Data\s*:/i, '').trim() || '---';
    const requisitante = strongs[0]?.innerText || '---';
    const contato      = strongs[1]?.innerText || '---';
    const os           = strongs[2]?.innerText || '---';
    const placa        = strongs[3]?.innerText || '---';
    const cliente      = strongs[4]?.innerText || '---';
    const modelo       = strongs[5]?.innerText || '---';
    const numeroLimpo  = nRomaneio.replace(/\D/g, '') || Date.now().toString();

    // ── Monta TXT formatado ──────────────────────────────────
    let txt = `                                                                | REEMISSÃO |\n`;
    const topoInfo = `Nº:   ${numeroLimpo} - ${dataRom} -+`;
    txt += `+-----------------     ROMANEIO DE RETIRADA    ${topoInfo.padStart(55)}\n`;
    txt += `| REQ.: ${requisitante}`.padEnd(42) + `CONTATO:   ${contato}`.padEnd(20) + `OS:      ${os}`.padEnd(15) + `|\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| CLIENTE:     ${cliente}`.padEnd(55) + `PLACA:  ${placa}`.padEnd(22) + `|\n`;
    txt += `| MODELO: ${modelo.padEnd(68)}|\n`;
    txt += `+------------------------------------------------------------------------------+\n`;
    txt += `| --LOCACAO--     --QUANT--  --ITEM--  --DESCRICAO--                --CHECK--  |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;

    linhas.forEach(linha => {
        if (linha.querySelector('.estado-vazio')) return;
        const loc   = (linha.querySelector('.col-locacao')?.innerText.trim() || '').padEnd(16);
        const qtd   = parseFloat((linha.querySelector('.col-qtd')?.innerText.trim() || '0').replace(',','.')).toFixed(2).replace('.',',').padStart(5);
        const cod   = (linha.querySelector('.col-codigo')?.innerText.trim() || '').padStart(6);
        const desc  = linha.querySelector('.col-descricao')?.innerText.trim() || '';
        const descF = (desc.length > 33 ? desc.substring(0,30)+'...' : desc).padEnd(33);
        const chk   = linha.querySelector('input[type="checkbox"]')?.checked ? '[X]' : '[ ]';
        txt += `| ${loc}  ${qtd}  ${cod}      ${descF}  ${chk.padStart(5)} |\n`;
        txt += `+------------------------------------------------------------------------------+\n`;
    });

    txt += `| SEPARADOR:                 AUTORIZANTE:                RECEBIDO:             |\n`;
    txt += `+------------------------------------------------------------------------------+\n`;

    // ── Envia para o banco ───────────────────────────────────
    const dadosSalvar = {
        id:            numeroLimpo,
        nome:          `Romaneio ${numeroLimpo}`,
        data:          new Date().toLocaleString('pt-BR'),
        cliente:       cliente,
        total_itens:   totalItens,
        conferidos:    conferidos,
        itens:         itensParaBanco,
        txt_formatado: txt,
        status:        conferidos === totalItens && totalItens > 0 ? 'FECHADO' : 'ABERTO'
    };

    try {
        const resposta = await fetch('http://localhost:3000/salvar-romaneio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosSalvar)
        });

        if (resposta.ok) {
            alert(`✔ Romaneio ${numeroLimpo} salvo! (${conferidos}/${totalItens} conferidos)`);
            const btnTxt = document.getElementById('botao-baixar-txt');
            if (btnTxt) { btnTxt.style.display = 'inline-block'; btnTxt.dataset.id = numeroLimpo; btnTxt.dataset.nome = 'r' + numeroLimpo + '.txt'; }
        } else {
            throw new Error('Resposta inválida do servidor');
        }
    } catch (err) {
        alert('❌ Erro ao salvar. Verifique se o servidor está rodando.');
        console.error(err);
    }
}
async function baixarTxt() {
    const btn = document.getElementById('botao-baixar-txt');
    const id = btn.dataset.id;
    const nomeArquivo = btn.dataset.nome || `r${id}.txt`;

    try {
        const resposta = await fetch(`http://localhost:3000/romaneio-txt/${id}`);
        const dados = await resposta.json();

        if (!dados.txt_formatado) {
            alert('TXT não encontrado. Salve o romaneio primeiro!');
            return;
        }

        const blob = new Blob([dados.txt_formatado], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        alert('❌ Erro ao baixar TXT. Verifique se o servidor está rodando.');
        console.error(err);
    }
    
}