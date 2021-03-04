var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
/* GET home page. */

router.get("/", function (req, res, next) {
  res.render("index", {
    title: "Lots of stock available, try adding '/symbols' to the url",
  });
});

//Complete as per Swagger
router.get("/symbols", function (req, res) {
  //store req.query keys to check if they are valid
  const queryKeys = Object.keys(req.query);
  //check if query params exist and make sure only industry query is permitted
  if (
    (queryKeys.length !== 0 && !queryKeys.includes("industry")) ||
    queryKeys.length > 1
  ) {
    res.status(400).json({
      error: true,
      message: "Invalid query parameter: only 'industry' is permitted",
    });
  } else {
    //check database for companies optional search by industry
    req.db
      .from("stocks")
      .distinct()
      .select("name", "symbol", "industry")
      .modify(function (queryBuilder) {
        if (req.query.industry) {
          queryBuilder.where("industry", "like", `%${req.query.industry}%`);
        }
      })
      .then((rows) => {
        //if data exists
        if (rows.length) {
          //success
          res.status(200).json(rows);
        } else {
          //no data exists 404
          res.status(404).json({
            error: true,
            message: "Industry sector not found",
          });
        }
      })
      .catch((err) => {
        res
          .status(500)
          .json({ Error: true, Message: "Error executing MySQL query" });
      });
  }
});

//Comeplete as per Swagger
router.get("/:symbol", function (req, res, next) {
  //store req.query keys to check if they are valid
  const queryKeys = Object.keys(req.query);
  //check if user has passed params into unauthed route
  if (queryKeys.length !== 0) {
    //check if date values are passed
    if (queryKeys.includes("from") || queryKeys.includes("to")) {
      res.status(400).json({
        error: true,
        message:
          "Date parameters only available on authenticated route /stocks/authed",
      });
    } else {
      //check if any other querys have been passed
      res
        .status(400)
        .json({ error: true, message: "Invalid query parameters" });
    }
  } else {
    req.db
      .from("stocks")
      .select("*")
      .where("symbol", "=", req.params.symbol)
      .limit(1)
      .then((row) => {
        if (row.length) {
          res.status(200).json(row[0]);
        } else {
          res.status(404).json({
            error: true,
            message: "No entry for symbol in stocks database",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ Error: true, Message: "Error executing MySQL query" });
      });
  }
});

////The below are helpers for the final route

//authorize path
const authorize = (req, res, next) => {
  const secretKey = process.env.MYAPIKEY;
  const authorization = req.headers.authorization;
  let token = null;
  //retreive token
  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, secretKey);
      if (decoded.exp > Date.now()) {
        res.status(403).json({ error: true, message: "Token has expired" });
        return;
      }
      next();
    } catch (e) {
      res.status(403).json({ error: true, message: "invalid token" });
    }
  } else {
    res
      .status(403)
      .json({ error: true, message: "Authorization header not found" });
  }
};

//check if date can be parsed by Date.parse()
const checkJsonDateIsValid = (dateToCheck) => {
  if (Date.parse(dateToCheck)) {
    return true;
  } else {
    return false;
  }
};
////

//comlete as per swagger
router.get("/authed/:symbol", authorize, function (req, res, next) {
  //store req.query keys to check if they are valid
  let fromDate = "";
  let toDate = "";
  let isError = false;
  const queryKeys = Object.keys(req.query);
  //check if query params exist
  if (queryKeys.length !== 0) {
    switch (queryKeys.length) {
      //case 1 query param
      case 1:
        //check if it is from or to
        if (!(queryKeys.includes("from") || queryKeys.includes("to"))) {
          isError = true;
        } else if (queryKeys.includes("from")) {
          //check if date is valid type
          if (checkJsonDateIsValid(req.query.from)) {
            fromDate = new Date(req.query.from);
          } else {
            isError = true;
          }
        } else if (queryKeys.includes("to")) {
          if (checkJsonDateIsValid(req.query.to)) {
            toDate = new Date(req.query.to);
          } else {
            isError = true;
          }
        }
        break;
      //case 2 query params
      case 2:
        if (!(queryKeys.includes("from") && queryKeys.includes("to"))) {
          isError = true;
        } else {
          //check dates are valid types
          if (
            checkJsonDateIsValid(req.query.from) &&
            checkJsonDateIsValid(req.query.to)
          ) {
            fromDate = new Date(req.query.from);
            toDate = new Date(req.query.to);
          } else {
            isError = true;
          }
        }
        break;
      //if more then 2 query params return an error
      default:
        isError = true;
    }
  }
  //error status 400 on inocrrect query params
  if (isError) {
    res.status(400).json({
      error: true,
      message:
        "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15",
    });
  } else {
    req.db
      .from("stocks")
      .select("*")
      .modify(function (queryBuilder) {
        //if req.query.from check if value is Date
        if (fromDate) {
          queryBuilder.where("timestamp", ">", fromDate);
        }
        //if req.query.to check if value is Date
        if (toDate) {
          queryBuilder.where("timestamp", "<", toDate);
        }
      })
      .where("symbol", "=", req.params.symbol)
      .then((rows) => {
        //check if value is returned
        if (rows.length) {
          res.status(200).json(rows);
        } else {
          //return 404 if nothing
          res.status(404).json({
            error: true,
            message:
              "No entries available for query symbol for supplied date range",
          });
        }
      })
      //catch return errors on server side
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ Error: true, Message: "Error executing MySQL query" });
      });
  }
});

module.exports = router;
