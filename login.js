const express = require("express")
const bodyParser = require("body-parser")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const session = require("express-session")

const app = express()
const port = 3000

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))
app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: true,
  })
)

// Connect to SQLite database
const db = new sqlite3.Database("./users.db")

// Create users table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )`)
})

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next()
  } else {
    res.redirect("/")
  }
}

// Serve login page
app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/index2.html")
  } else {
    res.sendFile(path.join(__dirname, "public", "login.html"))
  }
})

// Serve register page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"))
})

// Handle registration form submission
app.post("/register", (req, res) => {
  const { email, password } = req.body

  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, password],
    function (err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
          res.status(400).send("Email already exists")
        } else {
          console.error(err)
          res.status(500).send("Error registering new user")
        }
      } else {
        req.session.userId = this.lastID
        res.redirect("/index2.html")
      }
    }
  )
})

// Handle login form submission
app.post("/login", (req, res) => {
  const { email, password } = req.body

  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, row) => {
      if (err) {
        console.error(err)
        res.status(500).send("Internal server error")
      } else if (row) {
        req.session.userId = row.id
        res.redirect("/index2.html")
      } else {
        res.status(401).send("Invalid email or password")
      }
    }
  )
})

// Handle logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return console.log(err)
    }
    res.redirect("/")
  })
})

// Serve index.html for everyone
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Serve index2.html only if the user is authenticated
app.get("/index2.html", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index2.html"))
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`)
})
