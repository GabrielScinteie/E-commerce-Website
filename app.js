const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const cookieParser=require('cookie-parser');
const session = require('express-session');

const app = express();
app.use(cookieParser())
app.use(session({secret: 'ssshhhhh'}))

const port = 6789;

var sqlite3 = require('sqlite3');

const res = require('express/lib/response');

const fs = require('fs');
const { Console } = require('console');

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
  myBD.all(`
  select product_id, name, price
  from product;
  `, (err,rows) => {
     res.render("index", {u : req.session.utilizator, products : rows});
  })
  
});

var myBD = new sqlite3.Database('./cumparaturi.db', sqlite3.OPEN_READWRITE)

app.get('/creare-bd', (req, res) => {
  myBD = new sqlite3.Database('./cumparaturi.db', (err) => {
      myBD.exec(`
        create table if not exists product (
          product_id int primary key not null,
          name text not null,
          price real
        );
        `, ()  => {
            res.redirect('/');
    });
  });
})

app.get('/inserare-bd', (req,res) =>{
  myBD.exec(`
    insert into product( product_id, name, price) values (2, "Mouse", 20);
  `, () => {
    res.redirect('/');
  })
})

app.post('/adaugare_cos', (req, res) => {
  sess = req.session
  sess.arrayOfProducts = sess.arrayOfProducts || [];
  sess.arrayOfProducts.push(req.body.id)
  console.log(sess.arrayOfProducts)
  res.redirect('/')
})



// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	fs.readFile('intrebari.json', (err, content) => {
    if(err) throw err;
    let intrebari = JSON.parse(content);
    	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {intrebari: intrebari});
  })
});

app.get("/autentificare", (req, res) => {
  if(req.cookies.utilizator == null)
    res.render("autentificare", {err : req.cookies.errMsg});
  else
    res.redirect("/");
})

app.get('/vizualizare-cos', (req, res) =>{
  if(req.session.utilizator != null)
  {
    res.render("vizualizare-cos", {products : req.session.arrayOfProducts})
  }
})

app.get("/delogare", (req, res) => {
  req.session.destroy();
  res.redirect("/");
})

let utilizatori = JSON.parse(fs.readFileSync('utilizatori.json'));

app.post("/verificare-autentificare", (req, res) => {
  for(let i in utilizatori)
  {
    if(req.body["name"] == utilizatori[i].utilizator && req.body["password"] == utilizatori[i].parola)
    {
        sess = req.session
        console.log(sess);
        sess.utilizator = req.body.name;
        console.log(sess.name);
        res.clearCookie("errMsg");
        res.redirect("/");
        return;
    }
  }
    
  res.cookie("errMsg", "Utilizator sau parola gresita!");
  res.redirect("/autentificare");
  
})

app.post('/rezultat-chestionar', (req, res) => {
  fs.readFile('intrebari.json', (err, content) => {
    if(err) throw err;
    let intrebari = JSON.parse(content);
    let nrCorecte = 0
    for(i in intrebari)
    {
      if(req.body[`q${i}`] == intrebari[i].corect)
        nrCorecte++;
    }
    res.render("rezultat-chestionar", {punctaj: nrCorecte});
  })
  
	// res.send("formular: " + JSON.stringify(req.body));
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));