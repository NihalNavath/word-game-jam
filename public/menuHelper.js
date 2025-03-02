const totalOnline = document.getElementById("online-count");
const usernameField = document.getElementById("playerName");
const playButton = document.getElementById("play-button");

const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('error');

console.log(error)

if (error){
    const errorBox = document.getElementById("error-div");
    errorBox.setAttribute("style", "display: block !important;");
    errorBox.innerText = error;
}

const getRandomName = async () => {
    const names = await fetch('/data/names.json')
        .then(response => response.json())
        .then(res => res["names"]) 

    return names[Math.floor(Math.random() * names.length)]
}

getRandomName().then(
    res => {
        usernameField.value = res
    }
)

const fetchTotalOnline = () => {
    fetch("/api/playercount").then(res => res.json())
    .then(res => {
        totalOnline.innerText = `Total Online: ${res.count}`
    })
}

fetchTotalOnline();
setInterval(fetchTotalOnline, 5000);

playButton.addEventListener("click", (e => {
    const username = document.getElementById("playerName").value.trim();
    location.href = `/play?name=${encodeURIComponent(username)}`
}));