const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./oficina.db');

db.serialize(() => {
    // 1. Limpa a tabela para recomeçar
    db.run("DELETE FROM itens_estoque");

    const insert = db.prepare(`INSERT OR REPLACE INTO itens_estoque 
        (EMPRESA, ITEM_ESTOQUE, ITEM_ESTOQUE_PUB, DES_ITEM_ESTOQUE, COD_EAN_GTIN) 
        VALUES (?, ?, ?, ?, ?)`);

    console.log("Lendo arquivo itens.csv...");

    fs.createReadStream('itens.csv')
        .pipe(csv({ 
            separator: '|',
            quote: '"', // Trata aspas duplas se houver
            mapHeaders: ({ header }) => header.replace(/"/g, '').trim() // LIMPA ASPAS DOS NOMES DAS COLUNAS
        }))
        .on('data', (row) => {
            // Pegamos os dados limpando as aspas dos valores também
            const empresa = row['EMPRESA']?.replace(/"/g, '').trim();
            const item = row['ITEM_ESTOQUE']?.replace(/"/g, '').trim();
           const pub = row['ITEM_ESTOQUE_PUB']?.toString().replace(/"/g, '').trim();
            const desc = row['DES_ITEM_ESTOQUE']?.replace(/"/g, '').trim();
            const ean = row['COD_EAN_GTIN']?.replace(/"/g, '').trim();

            if (pub && pub !== "") {
                insert.run(empresa, item, pub, desc, ean);
            }
        })
        .on('end', () => {
            insert.finalize();
            console.log('✅ Importação finalizada!');
            
            // CONFERÊNCIA AUTOMÁTICA
            db.get("SELECT COUNT(*) as total FROM itens_estoque", (err, row) => {
                console.log(`📊 Total de itens no banco agora: ${row.total}`);
                db.close();
            });
        })
        .on('error', (err) => {
            console.error("❌ Erro no arquivo:", err.message);
        });
});