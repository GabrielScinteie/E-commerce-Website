const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const cookieParser=require('cookie-parser');
const session = require('express-session');
const requestIp = require('request-ip');

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

produse = []
attempts = {} // dictionar ce va avea ca si cheie IP-ul, iar ca si valoare numarul de incercari
bannedTimeStamp = {} // dictionar ce va avea ca si cheie IP-ul, iar ca si valoarea momentul blocarii
// se va considera o perioada de ban de 30 minute

function checkBlacklist(req, res) {
  let clientIp = requestIp.getClientIp(req);
  console.log(clientIp)
  if(req.session.blockedIp != null){
      if(req.session.blockedIp.includes(clientIp)){
          res.send('Prea multe incercari de accesare a resurselor inexistente! IP blocat temporar!')
          return true
      }
  }
  return false
}


// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) =>  {
  checkBlacklist(req, res)
  myBD.all(`
  select product_id, name, price
  from product;
  `, (err,rows) => {
    produse = rows
     res.render("index", {u : req.session.utilizator, tip : req.session.tip, products : rows});
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
  checkBlacklist(req, res)
  if(req.session.cumparaturi == null)
    req.session.cumparaturi = []
  if(req.session.cumparaturi[req.body.id] != null)
    req.session.cumparaturi[req.body.id] = req.session.cumparaturi[req.body.id] + 1
  else
    req.session.cumparaturi[req.body.id] = 1
  res.redirect('/')
})

app.post('/adaugare_produs', (req, res) =>{
  //console.log("Nume: " + req.body.name + "\nCantitate: " + req.body.price)
  //res.send("Nume: " + req.body.name + "\nCantitate: " + req.body.price)
  let name = req.body.name
  let price = req.body.price
  let myBD = new sqlite3.Database('./cumparaturi.db', (err) => {
    if(err) {
        console.log(err.message);
        return;
    }
  });

  myBD.all(`SELECT MAX(product_id) AS maxID FROM product`, (err, data) => {
    if(err) {
        return console.log(err.message); 
    }
    let maxId = data[0].maxID
    myBD.run(`INSERT INTO product(product_id, name, price) VALUES (?, ?, ?)`, [maxId + 1, name, price], (err) => {
        if(err) {
            return console.log(err.message); 
        }
        console.log('Adaugare reusita!');
        res.redirect('/')
    })
  })
})


// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
  checkBlacklist(req, res)
	fs.readFile('intrebari.json', (err, content) => {
    if(err) throw err;
    let intrebari = JSON.parse(content);
    	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {intrebari: intrebari});
  })
});

app.get("/autentificare", (req, res) => {
  checkBlacklist(req, res)
  ip = requestIp.getClientIp(req)
  
  if(ip in bannedTimeStamp)
  {
    console.log(bannedTimeStamp[ip])
    console.log(Date.now())   
    if(bannedTimeStamp[ip] + 10000 > Date.now())
      res.send("Logarea esuata de prea multe ori! Asteapta 10 secunde!");
    else
      delete bannedTimeStamp[ip]
      attempts[ip] = 0
      req.session.errMsg = null;
  }

  if(req.session.utilizator == null)
    res.render("autentificare", {err : req.session.errMsg});
  else
    res.redirect("/");
})

app.post("/verificare-autentificare", (req, res) => {
  for(let i in utilizatori)
  {
    if(req.body["name"] == utilizatori[i].utilizator && req.body["password"] == utilizatori[i].parola)
    {
        sess = req.session
        console.log(sess);
        sess.utilizator = req.body.name;
        sess.tip = utilizatori[i].tip
        console.log(sess.name);
        req.session.errMsg = null;
        res.redirect("/");
        return;
    }
  }
    
  req.session.errMsg = "Utilizator sau parola greșită!";
  ip = requestIp.getClientIp(req)
  if(ip in attempts)
  {
    attempts[ip] = attempts[ip] + 1
    if(attempts[ip] > 5)
    {
      bannedTimeStamp[ip] = Date.now()
    }
  }
  else
  {
    attempts[ip] = 1;
  }

  //console.log(attempts[ip])
  res.redirect("/autentificare");
})

app.get('/vizualizare-cos', (req, res) =>{
  checkBlacklist(req, res)
  if(req.session.utilizator != null)
  {
    myBD.all(`
    select name
    from product;
    `, (err,rows) => {
      res.render("vizualizare-cos", {products: rows, quantities : req.session.cumparaturi})
    })
  }
})

app.get("/delogare", (req, res) => {
  checkBlacklist(req, res)
  req.session.destroy();
  res.redirect("/");
})

let utilizatori = JSON.parse(fs.readFileSync('utilizatori.json'));



app.get('/admin', (req,res) => {
  checkBlacklist(req, res)
  if(req.session.tip != 'admin')
    res.redirect("/")
  //res.send("Bine ai venit pe pagina de admin, " + req.session.utilizator)
  res.render("admin")
})

app.post('/rezultat-chestionar', (req, res) => {
  fs.readFile('intrebari.json', (err, content) => {
    if(err) throw err;
    let intrebari = JSON.parse(content);
    let nrCorecte = 0
    for(i in intrebari)
    {
      if(parseInt(req.body[`q${i}`]) + 1 == parseInt(intrebari[i].corect))
        nrCorecte++;
    }
    res.render("rezultat-chestionar", {punctaj: nrCorecte});
  })
  
	// res.send("formular: " + JSON.stringify(req.body));
});


app.use(function(req, res) {
  res.statusCode = 404;
  if(req.session.accessCounter == null){
      req.session.accessCounter = 1
  }
  else{
      req.session.accessCounter++
  }
  console.log(req.session.accessCounter)
  if(req.session.accessCounter > 5){
      req.session.blockedIp = req.session.blockedIp || []; 
      let clientIp = requestIp.getClientIp(req);
      if(!req.session.blockedIp.includes(clientIp)){
          req.session.blockedIp.push(clientIp)
      }
  }
  res.send('Error 404! Page not found!')
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));