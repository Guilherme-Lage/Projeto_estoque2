const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const dbPath = path.resolve(__dirname, 'oficina.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Erro ao abrir banco:", err.message);
    else console.log("Conectado ao banco de dados SQLite da Hontec.");
});

db.serialize(() => {
    db.run("DROP TABLE IF EXISTS produtos");

    db.run(`CREATE TABLE IF NOT EXISTS itens_estoque (
        EMPRESA TEXT,
        ITEM_ESTOQUE TEXT,
        ITEM_ESTOQUE_PUB TEXT PRIMARY KEY,
        DES_ITEM_ESTOQUE TEXT,
        COD_EAN_GTIN TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS romaneios (
        id TEXT PRIMARY KEY,
        nome TEXT,
        data TEXT,
        cliente TEXT,
        itens_json TEXT,
        status TEXT
    )`);
});

// --- ROTAS ---

// 1. Salvar ou Atualizar Romaneio
app.post('/salvar-romaneio', (req, res) => {
    const { id, nome, data, cliente, itens, status } = req.body;
    const sql = `INSERT OR REPLACE INTO romaneios (id, nome, data, cliente, itens_json, status) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, nome, data, cliente, JSON.stringify(itens), status], function (err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: "Romaneio salvo com sucesso!" });
    });
});

// 2. Buscar todos os produtos (Corrigido o nome da tabela)
app.get('/produtos', (req, res) => {
    db.all("SELECT * FROM itens_estoque", [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 3. Buscar produto por Código ou EAN (Movido para antes do listen)
app.get('/buscar-produto/:termo', (req, res) => {
    const termo = req.params.termo;
    const sql = `SELECT * FROM itens_estoque WHERE ITEM_ESTOQUE_PUB = ? OR COD_EAN_GTIN = ?`;

    db.get(sql, [termo, termo], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (row) res.json(row);
        else res.status(404).json({ mensagem: "Produto não encontrado" });
    });
});

// 4. Buscar Romaneio Específico
app.get('/romaneio/:id', (req, res) => {
    db.get("SELECT * FROM romaneios WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(row);
    });
});

// Inicialização
app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Servidor Hontec Ativo!`);
    console.log(`💻 Local: http://192.168.15.254:${port}`);
    console.log(`📱 Celular: Use o IP do seu PC na porta ${port}`);
});
const { exec, spawn } = require('child_process');
const { execSync } = require('child_process');

let monitorProcesso = null;

// Inicia o monitor em background (não bloqueia o servidor)
app.get('/executar-python', (req, res) => {
    if (monitorProcesso && !monitorProcesso.killed) {
        console.log('⚠️ Monitor já está rodando.');
        return res.json({ mensagem: 'ja_rodando' });
    }

    const scriptPath = path.resolve(__dirname, 'monitor_bloco_notas.py');
    monitorProcesso = spawn('python', [scriptPath], { detached: false, shell: true });

    monitorProcesso.on('error', (err) => console.error('❌ Erro ao iniciar monitor:', err));
    monitorProcesso.on('exit', () => { monitorProcesso = null; });

    console.log(`🚀 Monitor iniciado em background (PID: ${monitorProcesso.pid})`);
    res.json({ mensagem: 'iniciado' });
});

// Abre o Bloco de Notas, copia o conteúdo e fecha — usa VBS para ter permissão de janela
app.get('/copiar-romaneio', (req, res) => {
    const scriptPath = path.resolve(__dirname, 'copiar_romaneio.py');
    const tempFile = path.join(require('os').tmpdir(), 'romaneio_copiado.txt');
    const vbsPath = path.join(require('os').tmpdir(), 'rodar_python.vbs');
    const fs = require('fs');

    // Cria um .vbs temporário que roda o Python com permissão de janela
    const vbsConteudo = `Set oShell = CreateObject("WScript.Shell")\noShell.Run "python """ & "${scriptPath.replace(/\\/g, '\\\\')}" & """", 1, True`;
    fs.writeFileSync(vbsPath, vbsConteudo);

    exec(`cscript //nologo "${vbsPath}"`, { shell: true, timeout: 12000 }, (error) => {
        if (error) {
            console.error('❌ Erro ao copiar romaneio:', error.message);
            return res.status(500).json({ erro: error.message });
        }
        try {
            const conteudo = fs.readFileSync(tempFile, 'utf8');
            if (!conteudo || conteudo.trim() === '') return res.json({ conteudo: '' });
            res.json({ conteudo });
        } catch (e) {
            res.status(500).json({ erro: 'Arquivo temporário não encontrado.' });
        }
    });
});