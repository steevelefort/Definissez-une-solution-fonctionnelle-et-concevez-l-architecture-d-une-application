var express = require('express');
var router = express.Router();
const pool = require('../database');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/init', async function(req, res, next) {
  const userId = req.user.id;
  const session = await pool.query("insert into conversations (client_id, is_chat) values ($1, true) returning id", [userId]);

  console.log(session)

  res.send({sessionId: session.rows[0].id});
});


router.get('/my', async function(req, res, next) {
  const userId = req.user.id;

  let query = "";
  if (req.user.is_support) {
    query = "select c.id, u.first_name, u.last_name, c.agent_id, m.sender_id, m.sent_at from conversations c inner join users u on (c.client_id = u.id) left join lateral (select sender_id, sent_at from messages where conversation_id = c.id order by sent_at desc limit 1) m on true where (agent_id = $1 or agent_id is null) and is_chat = true and is_closed = false";
  } else {
    query = "select c.id, u.first_name, u.last_name, c.agent_id, m.sender_id, m.sent_at from conversations c left join users u on (c.agent_id = u.id) left join lateral (select sender_id, sent_at from messages where conversation_id = c.id order by sent_at desc limit 1) m on true where client_id = $1 and is_chat = true and is_closed = false";
  }

  const sessions = await pool.query(query, [userId]);

  // console.log(sessions.rows)

  res.send({sessions:sessions.rows});
});


router.get('/history/:sessionId', async function(req, res, next) {
  console.log(`Ask for session ${req.params.sessionId} history`)

  console.log(req.user.id, req.params.sessionId)
  const is_owner = await pool.query("select count(*) as check from conversations where client_id=$1 and id=$2", [req.user.id, req.params.sessionId]);
  console.log(`is_owner:${is_owner} support:${req.user.is_support}`)
  if (req.user.is_support || is_owner.rows[0].check>0) {
    const data = await pool.query("select c.id as session, m.message, u.id, u.first_name, u.last_name, u.is_support from messages m inner join conversations c on m.conversation_id=c.id inner join users u on m.sender_id=u.id where c.id=$1 order by m.id asc", [req.params.sessionId]);
    const messages = data.rows.map((message) => 
      ({
        session: message.session,
        message: message.message,
        user: {
          id:message.id,
          first_name:message.first_name,
          last_name:message.last_name,
          is_support:message.is_support
        }
      })
    )
    console.log(`${messages.length} messages`)
    return res.send({messages})
  } else {
    return res.send({messages: []})
  }

})


module.exports = router;
