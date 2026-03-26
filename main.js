let totalItens = 0;
let conferidos = 0;

function carregarArquivo(input) {
  // Acessa o primeiro arquivo da lista [0]
  const arquivo = input.files[0];
  
  if (!arquivo) return;

  document.getElementById('legenda-arquivo').textContent = arquivo.name;

  const leitor = new FileReader();
  leitor.onload = function(e) {
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

  // Expressão regular para capturar os dados entre as barras |
  const regex = /\|\s+([\d.A-Za-z]+)\s+([\d,]+)\s+(\d+)\s+(.*?)\s*\|/;

  for (let linha of linhas) {
    const match = linha.match(regex);
    if (match) {
      const locacao = match[1].trim();
      const qtd = match[2].trim().replace(',', '.');
      const codigo = match[3].trim();
      const descricao = match[4].trim();

      // Ignora linhas de cabeçalho
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

  // Mostra informação do romaneio
  if (infoRomaneio) {
    const elementoInfo = document.getElementById('info-romaneio');
    elementoInfo.style.display = 'block';
    elementoInfo.textContent = infoRomaneio;
  }

  // Ativa o contador e o botão de limpar
  document.getElementById('secao-contador').style.display = 'block';
  document.getElementById('botao-limpar').style.display = 'inline-block';
  atualizarContador();

  // Monta a tabela
  corpoTabela.innerHTML = '';

  itens.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.id = `linha-${idx}`;
    tr.innerHTML = `
      <td class="col-locacao">${item.locacao}</td>
      <td class="col-qtd">${parseFloat(item.qtd).toFixed(0)}</td>
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

function limparTabela() {
  // Reseta o input e elementos visuais
  document.getElementById('entrada-arquivo').value = "";
  document.getElementById('legenda-arquivo').textContent = "Insira o .txt do Apollo";
  document.getElementById('info-romaneio').style.display = 'none';
  document.getElementById('secao-contador').style.display = 'none';
  document.getElementById('botao-limpar').style.display = 'none';
  
  totalItens = 0;
  conferidos = 0;
  
  // Reseta a tabela para o estado inicial
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = `
    <tr>
      <td colspan="5" class="estado-vazio">
        <p>Nenhum arquivo carregado</p>
      </td>
    </tr>
  `;
}
let mostrarApenasPendentes = false;

function filtrarTabela() {
  const busca = document.getElementById('busca-codigo').value.toLowerCase();
  const linhas = document.querySelectorAll('#corpo-tabela tr');

  linhas.forEach(linha => {
    const textoLinha = linha.innerText.toLowerCase();
    const corresponde = textoLinha.includes(busca);
    
    // Lógica combinada: Busca + Filtro de Ocultar
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
  filtrarTabela(); // Atualiza a visão
}

