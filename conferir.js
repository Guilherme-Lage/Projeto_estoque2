const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./oficina.db');

db.get("SELECT COUNT(*) as total FROM itens_estoque", [], (err, row) => {
    console.log(`\n Total de itens no banco: ${row ? row.total : 0}`);
});

db.all("SELECT * FROM itens_estoque LIMIT 5", [], (err, rows) => {
    console.log("\n Visualizando as novas colunas (Hontec):");
    console.table(rows); 

});
db.all("SELECT * FROM romaneios LIMIT 5", [], (err, rows) => {
    console.log("\n Visualizando as romaneios(Hontec):");
    console.table(rows); 

});

db.all("SELECT * FROM itens_estoque where COD_EAN_GTIN = 7798186476476", [], (err, rows) => {
    console.log("\nRodando select");
    console.table(rows);
    db.close();
});
