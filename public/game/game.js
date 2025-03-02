const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('name');

const timer = document.getElementById('timer');
const textField = document.getElementById("player-input");
const wordContainer = document.querySelector(".word-container");

document.addEventListener("click", () => {
    const audio = document.getElementById("bg-music");
    audio.play().catch(err => console.warn("Autoplay blocked:", err));
}, { once: true }); // Ensures it runs only once

const socket = io("http://localhost:3000", {
    auth: {
        username
    }
});

console.log("Client JS loaded.")

fetch("/api/sentence")
    .then(res => res.json())
    .then(data => {
        console.log(data.sentence)
        editSentence(data.sentence);
    })
    .catch(error => console.error("Error fetching sentence:", error));

socket.on("connect", () => {
    console.log("connected!");

    textField.addEventListener("keydown", (e) => {
        if (e.key == "Enter"){
            const text = textField.value.trim();
            const splitText = text.split(" ")
            
            if (text == "" || splitText.length > 1){
                alert("Enter a valid word. Make sure it is one ONE word.");
                return;
            }

            if (text.length > 20){
                alert("Enter a smaller word please.");
                return;
            }

            socket.emit("message", text);
            textField.value = "";
        }
    })
})

socket.on("new-word", (message) => {
    console.log("new word ping:- " + message)
    editSentence(message);
})

socket.on("turn-error", (message) => {
    alert(message);
})

socket.on("update-timer", ({ timer, turnUser }) => {
    const timerElement = document.getElementById("timer");

    if (turnUser === username) {
        timerElement.innerHTML = `${timer} seconds - your turn!`;
    } else {
        timerElement.innerHTML = `${timer} seconds - ${turnUser}'s turn!`;
    }
});


const editSentence = (message) => {
    // Clear the existing words
    wordContainer.innerHTML = "";

    message.split(" ").forEach(word => {
        const wordDiv = document.createElement("div");
        wordDiv.classList.add("word");
        wordDiv.textContent = word || "\u00A0"; // Use non-breaking space for empty words
        wordContainer.appendChild(wordDiv);
    });
};



socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message, err.data.userNameRelated);

    if (err.data?.userNameRelated){
        console.warn(err.message);
        location.href = `/?error=${err.message}`;
    }
});