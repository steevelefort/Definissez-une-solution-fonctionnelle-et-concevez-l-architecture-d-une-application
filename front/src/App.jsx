import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import ycywLogo from './assets/ycyw-logo.png'
import './App.css'
import Chat from './components/chat';
import config from './config';

function App() {

  const [token, setToken] = useState();
  const [user, setUser] = useState("");
  const [isChatActive, setIsChatActive] = useState(null);
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  let socketRef = useRef(null);

  const refreshSessionsList = async (newToken) => {
    try {
      // Get user’s current chat sessions
      const chatsResponse = await fetch(`${config.baseUrl}/chats/my`, { headers: { 'Authorization': `Bearer ${newToken || token}` } });
      const chatsData = await chatsResponse.json();
      // console.log(chatsData.sessions)
      setSessions(chatsData.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions list:', error);
    }
  }

  const authenticate = async () => {
    try {
      // Authenticate a user
      const response = await fetch(`${config.baseUrl}/users/token/${user}`);
      const data = await response.json();
      setUser(data)
      setToken(data.token);
      refreshSessionsList(data.token);
      setIsChatActive(false);
    } catch (error) {
      console.error('Failed to fetch token:', error);
    }
  };

  const initializeChat = async (sessionId) => {
    try {
      setMessages([]);
      if (sessionId == undefined) {
        // This a new session
        const response = await fetch(`${config.baseUrl}/chats/init`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        setSession(data.sessionId);
      } else {
        // Reopening an old session
        setSession(sessionId);
        const messagesResponse = await fetch(`${config.baseUrl}/chats/history/${sessionId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const oldMessages = await messagesResponse.json();
        setMessages(oldMessages.messages);
      }
      setIsChatActive(true)
    } catch (error) {
      console.error('Failed to fetch token:', error);
    }
  }

  const runChat = () => {
    const socket = io(`${config.baseUrl}`, {
      auth: {
        token: token
      }
    });
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit('client:join_session', { session })
    });

    socket.on("server:send_message", (data) => {
      setMessages(previous => [...previous, data])
    });

    socket.on("server:terminate", (data) => {
      setSessions(oldSessions => oldSessions.filter(item => item.id != session))
      closeChat();
    });

    socket.on("server:update", () => {
      refreshSessionsList();
    });

    return socket;
  }

  const sendMessage = (message) => {
    socketRef.current.emit("client:send_message", {
      session, message
    })
  }

  const closeChat = () => {
    refreshSessionsList();
    setIsChatActive(false);
    setSession(null);
  }

  const terminateChat = async () => {
    // Remove current session from opened sessions list
    socketRef.current.emit("client:terminate", { session })
  }

  // Connect and disconnect to socket when isChatActive change
  useEffect(() => {
    const socket = runChat();

    return () => {
      socket.disconnect();
    };
  }, [isChatActive]);

  return (
    <>
      <header>
        <img src={ycywLogo} className="logo" alt="Your Car Your Way logo" />
        <h1 className='text-center'>Service client</h1>
      </header>
      {token == undefined ? (
        <div className='text-center'>
          {/* Before login */}
          <div>Veuillez vous connecter</div>
          <div>
            <select onChange={(e) => { setUser(e.target.value) }} value={user} >
              <option value="" disabled>Veuillez choisir</option>
              <option value="1">Agent du support</option>
              <option value="2">Client</option>
            </select>
          </div>
          <div>
            <button
              onClick={authenticate}
              disabled={user == ""}
            >Connexion</button>
          </div>
        </div>
      ) : (
        <>
          {/* Here, we are connected ! */}
          {session == null ? (
            <div className='text-center'>
            {user.is_support ? (
              <h2>Sessions ouvertes</h2>
            ) : (
              <h2>Mes sessions en cours</h2>
            )}
              {sessions.length == 0 && (<div>Aucune</div>)}
              <ul className="sessions-list">
                {sessions.map((item) => (
                  <li key={item.id} onClick={() => { initializeChat(item.id) }}>

                  {user.is_support ? (
                      <div>{item.first_name} {item.last_name} ({item.id})</div>
                  ) : (
                    <>
                    {item.agent_id == null ? (
                      <div>En attente ...</div>
                    ) : (
                      <div>{item.first_name} {item.last_name}</div>
                    )}
                    </>
                  )}
                  </li>
                ))}
              </ul>

              {!user.is_support && (
                <div className='text-center'>
                  <h2>Une question ?</h2>
                  <div>Demandez de l’aide en démarrant un nouveau chat</div>
                  <button onClick={()=>{initializeChat()}}>Chattez avec notre support</button>
                </div>
              )}
            </div>
          ) : (
            <Chat user={user} close={closeChat} terminate={terminateChat} messages={messages} sendMessage={sendMessage} />
          )}
        </>
      )}
    </>
  )
}

export default App
