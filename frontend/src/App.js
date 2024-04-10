import './App.css';
import Chatbot, {
    InputBarTrigger,
    ModalView,
} from "mongodb-chatbot-ui";

const suggestedPrompts = [
    "Can you name a movie with a storyline set on the planet \"Mongo\"?",
    "Can you give example of a bank robbery movie?",
];

function App() {
    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    return (
        <div className="App">
            <div style={containerStyle}>
                <div style={{textAlign: 'center'}}>
                    <h1>
                        MongoDB AI Assistant
                    </h1>
                </div>

                <Chatbot serverBaseUrl={`${process.env.REACT_APP_BACKEND_URL}/api/v1`}>
                        <InputBarTrigger suggestedPrompts={suggestedPrompts} />
                    <ModalView
                        initialMessageText="Welcome to MongoDB Movie Expert AI Assistant. What can I help you with?"
                        initialMessageSuggestedPrompts={suggestedPrompts}
                    />
                </Chatbot>
            </div>
        </div>
    );


}


export default App;
