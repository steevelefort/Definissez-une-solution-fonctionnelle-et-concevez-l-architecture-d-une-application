import { useEffect, useRef, useState } from "react";

function Chat({ user, messages, sendMessage, close, terminate }) {

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    sendMessage(message);
    setMessage("");
  };

  const endChat = () => {
    if (confirm("Voulez-vous vraiment terminer ce chat ?")) {
      terminate()
    }
  }

  return (
    <>
      <div className="history">
        {messages.map((item, index) => (
          <div key={index} className={'flex-row' + (user.id != item.user.id ? ' align-right' : '')}>
            <div className={'message-bubble' + (user.id != item.user.id ? ' support' : '')}>
              <div className="from">
                <span className="bold"> {item.user.first_name} {item.user.last_name} </span> à dit:
              </div>
              <div>{item.message}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat" onSubmit={submit}>
        <textarea
          placeholder="Votre message"
          value={message}
          onChange={(e) => { setMessage(e.target.value) }}>
        </textarea>
        <button type="submit">Envoyer</button>
      </form>

      <div className="text-center">
        <button className="close" onClick={close}>Fermer ce chat</button>
        {user.is_support && (
          <button className="finish" onClick={endChat}>Cloturer cette session</button>
        )}
      </div>
    </>
  );
}

export default Chat;
