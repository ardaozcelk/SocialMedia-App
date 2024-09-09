const mongoose = require("mongoose");
const config = require("../config");


module.exports = async function () {
    await mongoose.connect(`mongodb+srv://${config.db.username}:${config.db.password}@cluster0.vrqogr8.mongodb.net/${config.db.database}?retryWrites=true&w=majority&appName=Cluster0`)
        .then(() => { console.log("mongodb bağlantısı kuruldu.") })
        .catch(err => { console.log("veritabanı bağlantısı kurulamadı."); process.exit(1) }); // eğer uygulama veritabanına bağlanamdıysa çıksın
}