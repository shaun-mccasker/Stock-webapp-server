var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("try /register or /login");
});

//Complete as per swagger
router.post("/register", function (req, res, next) {
  //store email and password body to check
  const email = req.body.email;
  const password = req.body.password;
  //check if password and body exist
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed",
    });
    console.log("Error on request body: ", JSON.stringify(req.body));
  } else {
    req.db
      .from("users")
      .select("*")
      .where("email", "=", email)
      .then((user) => {
        //check if user exists
        if (user.length > 0) {
          res
            .status(409)
            .json({ error: true, message: "User already exists!" });
        }
        //salted hash password
        const saltRounds = 10;
        const hash = bcrypt.hashSync(password, saltRounds);
        return req.db.from("users").insert({ email, hash });
      })
      //success
      .then((_) =>
        res.status(201).json({ success: true, message: "User created" })
      )
      //server side problem
      .catch((error) => {
        res
          .status(500)
          .json({ error: true, message: "Error executing sql command" });
        console.log(error);
      });
  }
});

//Complete as per swagger
router.post("/login", function (req, res, next) {
  const email = req.body.email;
  const password = req.body.password;
  //check if email and password exist in body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed",
    });
    console.log("Error on request body: ", JSON.stringify(req.body));
  } else {
    req.db
      .from("users")
      .select("*")
      .where("email", "=", email)
      .then((userRow) => {
        if (userRow.length === 0) {
          res
            .status(401)
            .json({ error: true, message: "email does not exist" });
        }
        //decrpyt salted (h(p))
        const user = userRow[0];
        return bcrypt.compare(password.toString(), user.hash.toString());
      })
      .then((match) => {
        //check if credentials match
        if (!match) {
          res
            .status(401)
            .json({ error: true, message: "Incorrect email or password" });
        } else if (match) {
          const secretKey = process.env.MYAPIKEY;
          const expires_in = 60 * 60 * 24; //1day
          const exp = Math.floor(Date.now() / 1000) + expires_in;
          const token = jwt.sign({ email, exp }, secretKey);
          //success
          res.status(200).json({
            token: token,
            token_type: "Bearer",
            expires_in: expires_in,
          });
        }
      })
      .catch((error) => {
        res
          .status(500)
          .json({ error: true, message: "Error executing mysql command" });
      });
  }
});

module.exports = router;
