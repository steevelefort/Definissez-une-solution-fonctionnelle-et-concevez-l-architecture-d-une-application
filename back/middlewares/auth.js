const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../database');

module.exports = async (req, res, next) => {
  try {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: 'No token provided' });
  }
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.SECRET);
    console.log(`récupération du token ${token} avec id ${decodedToken.id}`);

    const dbuser = await pool.query("select id, email, first_name, last_name, preferred_language, is_support from users where id = $1 and is_active = true and is_deleted = false", [decodedToken.id]);
    if (dbuser.rowCount == 0) {
      res.status(401).json({ message: 'Authentication failed!' });
    } else {
      req.user = dbuser.rows[0];
      next();
    }

  } catch (error) {
    console.log(error.message)
    res.status(401).json({ message: 'Authentication failed!' });
  }
};
