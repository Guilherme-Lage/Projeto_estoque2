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
    const busca = document.getElementById('busca-codigo').value.toLowerCase();
    const linhas = document.querySelectorAll('#corpo-tabela tr');

    linhas.forEach(linha => {
        const textoLinha = linha.innerText.toLowerCase();
        const corresponde = textoLinha.includes(busca);


        if (corresponde) {
            if (mostrarApenasPendentes && linha.classList.contains('linha-conferida')) {
                linha.style.display = 'none';
            } else {
                linha.style.display = '';
            }
        } else {
            linha.style.display = 'none';
        }
    });
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

    const registroNovo = {
        nome: nomeRomaneio,
        data: dataHora,
        total: totalItens,
        concluidos: conferidos
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

function limparTabela() {

    try {
        salvarNoHistorico();
    } catch (erro) {
        console.log("Falha ao salvar, mas limpando assim mesmo...");
    }


    const input = document.getElementById('entrada-arquivo');
    if (input) input.value = "";

    document.getElementById('legenda-arquivo').textContent = "Insira o .txt do Apollo";
    document.getElementById('info-romaneio').style.display = 'none';
    document.getElementById('secao-contador').style.display = 'none';
    document.getElementById('botao-limpar').style.display = 'none';


    totalItens = 0;
    conferidos = 0;

    const corpoTabela = document.getElementById('corpo-tabela');
    if (corpoTabela) {
        corpoTabela.innerHTML = `
            <tr>
                <td colspan="5" class="estado-vazio">
                    <p>Nenhum arquivo carregado</p>
                </td>
            </tr>
        `;
    }
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
        lista.innerHTML = dados.map(item => `
            <div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;">
                <strong>${item.nome}</strong><br>
                <span style="color:#888; font-size:10px;">${item.data}</span><br>
                <span style="color:${item.concluidos === item.total ? 'green' : 'orange'}">
                    Status: ${item.concluidos}/${item.total} OK
                </span>
            </div>
        `).join('');
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