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

function filtrarTabela() {
    const busca = document.getElementById('busca-codigo').value.toLowerCase().trim();
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    // Se o campo de busca estiver vazio, apenas reseta a tabela sem marcar nada
    if (busca === "") {
        linhas.forEach(linha => {
            if (mostrarApenasPendentes && linha.classList.contains('linha-conferida')) {
                linha.style.display = 'none';
            } else {
                linha.style.display = '';
            }
        });
        return;
    }

    let linhasVisiveis = [];

    linhas.forEach(linha => {
        // Ignora a linha que avisa que a tabela está vazia
        if (linha.querySelector('.estado-vazio')) return;

        const textoLinha = linha.innerText.toLowerCase();
        const corresponde = textoLinha.includes(busca);

        if (corresponde) {
            if (mostrarApenasPendentes && linha.classList.contains('linha-conferida')) {
                linha.style.display = 'none';
            } else {
                linha.style.display = '';
                linhasVisiveis.push(linha); // Guarda as linhas que passaram no filtro
            }
        } else {
            linha.style.display = 'none';
        }
    });

    // --- LÓGICA AUTOMÁTICA CORRIGIDA ---
    // Se a busca resultou em EXATAMENTE 1 item na tela
    if (linhasVisiveis.length === 1) {
        // CORREÇÃO AQUI: Adicionado o [0] para pegar o primeiro item da lista de visíveis
        const linhaUnica = linhasVisiveis[0]; 
        const checkbox = linhaUnica.querySelector('input[type="checkbox"]');
        
        // Se a caixinha existir e ainda não estiver marcada
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            
            // Extrai o número do ID (ex: "chk-5" vira 5)
            const matchId = checkbox.id.match(/\d+/);
            
            if (matchId) {
                const idx = parseInt(matchId[0], 10);
                
                // Dispara a função para colorir a linha e somar no contador
                marcarItem(idx, true);
                
                console.log(`Sucesso! Item da linha ${idx} marcado automaticamente.`);
            }
        }
    }
}


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
    try {

        const texto = await navigator.clipboard.readText();

        if (texto.trim() === "") {
            alert("A área de transferência está vazia. Copie o romaneio no Apollo primeiro!");
            return;
        }

        // Chama sua função que já existe para processar o texto
        processarTexto(texto);

        // Feedback visual para o usuário
        document.getElementById('legenda-arquivo').textContent = "Processado via Copiar/Colar";
        console.log("Romaneio processado sem salvar arquivo.");

    } catch (err) {

        alert("Não foi possível colar automaticamente. Use Ctrl+V no campo de busca.");
        console.error("Erro ao colar:", err);
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


function salvarTabelaEmArquivo() {
    const linhas = document.querySelectorAll('#corpo-tabela tr');
    
    if (linhas.length === 0 || document.querySelector('.estado-vazio')) {
        alert("Atenção: Carregue um romaneio na tabela primeiro para poder salvar!");
        return;
    }

    const spanNum = document.getElementById('cab-num-romaneio');
    const spanData = document.getElementById('cab-data-romaneio');
    
    // Captura segura dos dados
    const requisitante = document.querySelector('#cabecalho-corpo .cabecalho-item:nth-child(1) strong')?.innerText || '---';
    const contato = document.querySelector('#cabecalho-corpo .cabecalho-item:nth-child(2) strong')?.innerText || '---';
    const os = document.querySelector('#cabecalho-corpo .cabecalho-item:nth-child(3) strong')?.innerText || '---';
    const placa = document.querySelector('#cabecalho-corpo .cabecalho-item:nth-child(4) strong')?.innerText || '---';
    const cliente = document.querySelector('#cabecalho-corpo .item-full:nth-of-type(5) strong')?.innerText || '---';
    const modelo = document.querySelector('#cabecalho-corpo .item-full:nth-of-type(6) strong')?.innerText || '---';

    let nRomaneio = spanNum ? spanNum.innerText.replace('Romaneio Nº:', '').trim() : "---";
    let dataDoc = spanData ? spanData.innerText.replace('Data:', '').trim() : "---";

    // --- MONTAGEM DO ARQUIVO COM ESPAÇAMENTOS PRECISOS ---
    let textoTXT = `                                                                | REEMISSÃO |\n`;
    
    // Alinhamento exato do topo do romaneio
    const topoInfo = `Nº:   ${nRomaneio} - ${dataDoc} -+`;
    textoTXT += `+-----------------     ROMANEIO DE RETIRADA    ${topoInfo.padStart(55)}\n`;
    
    // Linha do Requisitante, Contato e OS
    const reqStr = `| REQ.: ${requisitante}`.padEnd(42, ' ');
    const contStr = `CONTATO:   ${contato}`.padEnd(20, ' ');
    const osStr = `OS:      ${os}`.padEnd(15, ' ');
    textoTXT += `${reqStr}${contStr}${osStr}|\n`;
    textoTXT += `+------------------------------------------------------------------------------+\n`;
    
    // Linha do Cliente e Placa
    const cliStr = `| CLIENTE:     ${cliente}`.padEnd(55, ' ');
    const placaStr = `PLACA:  ${placa}`.padEnd(22, ' ');
    textoTXT += `${cliStr}${placaStr}|\n`;
    
    // Linha do Modelo
    textoTXT += `| MODELO: ${modelo.padEnd(68, ' ')}|\n`;
    textoTXT += `+------------------------------------------------------------------------------+\n`;
    
    // Linha de Título das Colunas
    textoTXT += `| --LOCACAO--     --QUANT--  --ITEM--  --DESCRICAO--                --CHECK--  |\n`;
    textoTXT += `+------------------------------------------------------------------------------+\n`;
    textoTXT += `                                                                                \n`;

    // Varre as linhas da tabela e monta as grades
    linhas.forEach(linha => {
        if (linha.querySelector('.estado-vazio')) return;

        const locacao = linha.querySelector('.col-locacao')?.innerText.trim() || '';
        const qtd = linha.querySelector('.col-qtd')?.innerText.trim() || '0';
        const codigo = linha.querySelector('.col-codigo')?.innerText.trim() || '';
        const descricao = linha.querySelector('.col-descricao')?.innerText.trim() || '';
        
        const checkbox = linha.querySelector('input[type="checkbox"]');
        const checkSimbolo = checkbox && checkbox.checked ? "[X]" : "[ ]";

        // Ajuste milimétrico de colunas (Total de 78 caracteres de largura interna)
        const locacaoFormatada = locacao.padEnd(16, ' ');
        
        const qtdValor = parseFloat(qtd.replace(',', '.'));
        const qtdFormatada = qtdValor.toFixed(2).replace('.', ',').padStart(5, ' ');
        
        const codigoFormatado = codigo.padStart(6, ' ');
        const descricaoFormatada = (descricao.length > 33 ? descricao.substring(0, 30) + '...' : descricao).padEnd(33, ' ');
        const checkFormatado = checkSimbolo.padStart(5, ' ');

        // Unindo as partes para fechar exatamente a borda em 78 caracteres
        textoTXT += `| ${locacaoFormatada}  ${qtdFormatada}  ${codigoFormatado}      ${descricaoFormatada}  ${checkFormatado} |\n`;
        textoTXT += `+------------------------------------------------------------------------------+\n`;
    });

    // Linha de encerramento com assinaturas
    textoTXT += `| SEPARADOR:                 AUTORIZANTE:                RECEBIDO:             |\n`;
    textoTXT += `+------------------------------------------------------------------------------+\n`;

    // --- NOVA REGRA DO NOME DO ARQUIVO ---
    let nomeArquivo = "r_desconhecido.txt";
    if (nRomaneio !== "---") {
        // Remove qualquer caractere estranho e deixa só a letra r + número
        const numeroLimpo = nRomaneio.replace(/\D/g, ''); 
        nomeArquivo = `r${numeroLimpo}.txt`;
    }

    // Criando o arquivo
    const blob = new Blob([textoTXT], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
