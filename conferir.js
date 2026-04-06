const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./oficina.db');

db.get("SELECT COUNT(*) as total FROM itens_estoque", [], (err, row) => {
    console.log(`\n Total de itens no banco: ${row ? row.total : 0}`);
});

db.all("SELECT * FROM itens_estoque LIMIT 5", [], (err, rows) => {
    console.log("\n Visualizando as novas colunas (Hontec):");
    console.table(rows); 

});
db.all("SELECT id, nome, data, cliente, total_itens, conferidos, status FROM romaneios", [], (err, rows) => {
    console.log("\n Romaneios salvos:");
    console.table(rows);
    db.close();
});

// DELETA OS ULTIMOS 5 ITEMS DA TABELA ROMANEIO

// db.all("DELETE FROM romaneios WHERE id IN (SELECT id FROM romaneios ORDER BY id DESC LIMIT 5);", [], (err, rows) => {
//     console.log("\n Romaneios salvos:");
//     console.table(rows);
//     db.close();
// });

// ENDERECO DO SITE DA TABELA SALVA FORMATADA

//http://localhost:3000/romaneio-txt/15404
