const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('./database');

// This function will be exported and called in bin/www
module.exports = (io) => {
  // Middleware for authenticating socket connections with JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided.'));
    }

    jwt.verify(token, process.env.SECRET, async (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token.'));
      }

      try {

        const dbuser = await pool.query("select id, email, first_name, last_name, preferred_language, is_support from users where id = $1 and is_active = true and is_deleted = false", [decoded.id]);
        if (dbuser.rowCount == 0) {
          return next(new Error('Authentication error: Invalid token.'));
        } else {
          // Attach user info to the socket object for later use
          socket.user = dbuser.rows[0];
        }
      } catch (error) {
        console.error(error.message)
        return next(new Error('Authentication error: Invalid token.'));
      }

      next();
    });
  });

  // Main connection handler
  io.on('connection', (socket) => {
    // Automaticatily a personnal socket for user
    socket.join('user_' + socket.user.id);

    // If the connected user is a support agent, add them to the 'agents' room
    if (socket.user.is_support) {
      socket.join('support');
    }

    // A client joins his session
    socket.on('client:join_session', async (data) => {
      const { session } = data

      // Check if current user is the owner of the session or a support agent
      try {
        if (!socket.user.is_support) { // Support should pass but no unexcepted users
          const confim = await pool.query("select count(id) as check from conversations where id = $1 and client_id=$2 and is_closed=false", [session, socket.user.id]);

          if (confim.rows[0].check == 0) {
            return; 
          }
        }
      } catch (error) {
        console.error("socket.js join : ", error.message)
        return; 
      }

      // Finally: join the session
      socket.join(session)
    });

    socket.on('client:send_message', async (data) => {
      // Check if the current user is in the session (room)
      if (!socket.rooms.has(data.session)) {
        return
      }

      if (!socket.user.is_support) { // Support should pass but no unexcepted users
        // Check if current user own the current room
        try {
          const confim = await pool.query("select count(id) as check from conversations where id = $1 and client_id=$2 and is_closed=false", [data.session, socket.user.id]);
          if (confim.rows[0].check == 0) {
            return
          }
        } catch (error) {
          console.error(error.message)
          return
        }
      } else {
        // If the message is the first one, update the agent id on conversation
        try {
          const messageCount = await pool.query("select count(*) as counter from messages where conversation_id = $1 and sender_id = $2", [data.session, socket.user.id]);
          if (messageCount.rows[0].counter == 0) {
            const client = await pool.query("update conversations set agent_id=$1 where id=$2 returning client_id", [socket.user.id, data.session]);
            const client_id = client.rows[0].client_id;
            io.to("user_" + client_id).emit("server:update", {})
            io.to("support").emit("server:update", {})
          }
        } catch (error) {
          console.error(error.message)
        }
      }

      try {
        await pool.query("insert into messages (conversation_id, sender_id, message) values ($1, $2, $3)", [data.session, socket.user.id, data.message]);
      } catch (error) {
        console.error(error.message);
      }

      // If it is the first message, ask to support to refresh their list
      try {
        const messagesInConversation = await pool.query("select count(*) as counter from messages where conversation_id = $1", [data.session]);
        if (messagesInConversation.rows[0].counter == 1) {
          io.to("support").emit("server:update", {})
        }
      } catch (error) {
        console.error(error.message);
      }

      io.to(data.session).emit("server:send_message", { ...data, user: socket.user, support: socket.user.is_support });

    });

    /* Terminate a session and send a notification to users */
    socket.on('client:terminate', async (data) => {
      try {
        if (socket.user.is_support) { // Only support can terminate a session
          const client = await pool.query("update conversations set is_closed=true where id=$1 returning client_id", [data.session]);
          io.to("user_" + client.rows[0].client_id).emit("server:terminate", { session: data.session })
        }
        io.to(data.session).emit("server:terminate", { session: data.session })
        io.to("support").emit("server:terminate", { session: data.session })
      } catch (error) {
        console.error(error.message)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.info(`User disconnected: ${socket.user.email}`);
    });
  });
};
