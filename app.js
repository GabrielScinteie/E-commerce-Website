const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const cookieParser=require('cookie-parser');

const app = express();
app.use(cookieParser())

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) =>  {
  res.render("index", {u : req.cookies.utilizator});
});

const listaIntrebari = [
  {
    intrebare: 'Vrei punct din oficiu?',
    variante: ['Da', 'Nu', 'Poate', 'Se poate doua?'],
    corect: 3
  },
  {
    intrebare: 'Ce faci??',
    variante: ['Bine', 'Bine, tu?', 'Nimic', 'Seen'],
    corect: 1
  }
  //...
];

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
	res.render('chestionar', {intrebari: listaIntrebari});
});

app.get("/autentificare", (req, res) => {
  if(req.cookies.utilizator == null)
    res.render("autentificare", {err : req.cookies.errMsg});
  else
    res.redirect("/");
})

app.get("/delogare", (req, res) => {
  res.clearCookie("utilizator");
  res.redirect("/");
})

app.post("/verificare-autentificare", (req, res) => {
  if(req.body["name"] == "Gabi" && req.body["password"] == "123")
  {
    res.cookie("utilizator", "Gabi");
    res.clearCookie("errMsg");
    res.redirect("/");
  }
  else
  {
    res.cookie("errMsg", "Utilizator sau parola gresita!");
    res.redirect("autentificare");
  }
})

app.post('/rezultat-chestionar', (req, res) => {
  console.log(req.body);
  let nrCorecte = 0
  for(i in listaIntrebari)
  {
    if(req.body[`q${i}`] == listaIntrebari[i].corect)
      nrCorecte++;
  }
  
  res.render("rezultat-chestionar", {punctaj: nrCorecte});
	// res.send("formular: " + JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));