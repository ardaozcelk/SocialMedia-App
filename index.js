const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const csrf = require("csurf");

// JSON middleware kullanımı
app.use(express.json());

//body'den sağlıklı veri almak için
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// cookielerin yani çerezlerin işlenebilmesi için
app.use(cookieParser());

//CSRF Koruması Middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);


//database
require("./database/db")();

app.set("view engine", "ejs");

app.use("/static", express.static(path.join(__dirname, "public")));



//routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");


app.use("/", userRoutes);
app.use("/account", authRoutes);




app.listen(3000, () => {
    console.log("Server is running on port 3000");
});