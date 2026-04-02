const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- BANCO DE DADOS ---
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
        total_itens INTEGER,
        conferidos INTEGER,
        itens_json TEXT,
        txt_formatado TEXT,
        status TEXT
    )`);

    // Migração segura: adiciona colunas novas se a tabela já existia sem elas
    db.run(`ALTER TABLE romaneios ADD COLUMN total_itens INTEGER`, () => {});
    db.run(`ALTER TABLE romaneios ADD COLUMN conferidos INTEGER`, () => {});
    db.run(`ALTER TABLE romaneios ADD COLUMN txt_formatado TEXT`, () => {});
});

// --- ROTAS ---

// 1. Salvar ou Atualizar Romaneio
app.post('/salvar-romaneio', (req, res) => {
    const { id, nome, data, cliente, total_itens, conferidos, itens, txt_formatado, status } = req.body;
    const sql = `INSERT OR REPLACE INTO romaneios 
        (id, nome, data, cliente, total_itens, conferidos, itens_json, txt_formatado, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, nome, data, cliente, total_itens, conferidos, JSON.stringify(itens), txt_formatado, status], function (err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: "Romaneio salvo com sucesso!" });
    });
});

// 2. Buscar todos os produtos
app.get('/produtos', (req, res) => {
    db.all("SELECT * FROM itens_estoque", [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 3. Buscar produto por Código ou EAN
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

// 5. Listar romaneios resumidos
app.get("/romaneios", (req, res) => {
    const sql = `SELECT id, nome, data, cliente, total_itens, conferidos, status FROM romaneios ORDER BY data DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

// 5b. Buscar txt de romaneio especifico
app.get("/romaneio-txt/:id", (req, res) => {
    db.get("SELECT txt_formatado FROM romaneios WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (!row) return res.status(404).json({ mensagem: "Nao encontrado" });
        res.json({ txt_formatado: row.txt_formatado });
    });
});

// 6. Inicia o monitor do Bloco de Notas em background
let monitorProcesso = null;

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

// 6. Abre o Bloco de Notas, copia e fecha a aba — usa VBS para permissão de janela
app.get('/copiar-romaneio', (req, res) => {
    const scriptPath = path.resolve(__dirname, 'copiar_romaneio.py');
    const tempFile = path.join(os.tmpdir(), 'romaneio_copiado.txt');
    const vbsPath = path.join(os.tmpdir(), 'rodar_python.vbs');

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

// --- INICIALIZAÇÃO ---
app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Servidor Hontec Ativo!`);
    console.log(`💻 Local: http://localhost:${port}`);
    console.log(`📱 Celular: Use o IP do seu PC na porta ${port}`);
});