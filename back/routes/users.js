var express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../database');

var router = express.Router();

/**
 * Fake authentification for PoC
 */
router.get('/token/:id', async function(req, res, next) {
  const dbuser = await pool.query("select id, email, first_name, last_name, preferred_language, is_support from users where id = $1 and is_active = true and is_deleted = false", [req.params.id]);
  if (dbuser.rowCount == 0) {
    res.status(401)
    res.send({ message: "User not found" })
  } else {
    const options = {
      expiresIn: '1d',
    };
    const payload = { id: req.params.id };
    const token = jwt.sign(payload, process.env.SECRET, options);
    const user = {
      ...dbuser.rows[0],
      token
    }
    res.send(user);
  }
});

module.exports = router;
