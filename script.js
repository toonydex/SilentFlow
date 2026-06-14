function addTask() {
    const input = document.getElementById("taskInput");
    const list = document.getElementById("taskList");

    if(input.value.trim() === "") return;

    const li = document.createElement("li");

    li.innerHTML = `
        <input type="checkbox" class="taskCheck">
        <span>${input.value}</span>
        <button class="deleteBtn">🗑</button>
    `;

    li.querySelector(".taskCheck").addEventListener("change", function() {
        if(this.checked){
            li.style.textDecoration = "line-through";
            li.style.opacity = "0.6";
        } else {
            li.style.textDecoration = "none";
            li.style.opacity = "1";
        }

        saveTasks();
    });

    li.querySelector(".deleteBtn").addEventListener("click", function() {
        li.remove();
        saveTasks();
    });

    list.appendChild(li);

    input.value = "";

    saveTasks();
}

const reflection =
document.getElementById("reflection");

reflection.value =
localStorage.getItem("reflection") || "";

reflection.addEventListener("input", () => {

    localStorage.setItem(
        "reflection",
        reflection.value
    );

});

let timer;
let seconds = 1500;

function updateTimer() {
    const minutes =
        Math.floor(seconds / 60);

    const secs =
        seconds % 60;

    document.getElementById(
        "timerDisplay"
    ).textContent =
        `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function startTimer() {
    timer = setInterval(() => {
        seconds--;

        updateTimer();

        if(seconds <= 0) {
            clearInterval(timer);
            alert("Session Complete!");
        }

    },1000);
}

function pauseTimer() {
    clearInterval(timer);
}

function resetTimer() {
    clearInterval(timer);
    seconds = 1500;
    updateTimer();
}

updateTimer();

function saveTasks(){
    localStorage.setItem(
        "tasks",
        document.getElementById("taskList").innerHTML
    );
}

function loadTasks(){
    document.getElementById("taskList").innerHTML =
        localStorage.getItem("tasks") || "";
}

window.onload = loadTasks;

function updateDashboard(){

    const tasks =
        document.querySelectorAll("#taskList li");

    const completed =
        document.querySelectorAll(
            "#taskList input:checked"
        );

    document.getElementById("remaining").textContent =
        tasks.length - completed.length;
}

updateDashboard()

document.getElementById("taskList").addEventListener("click", function(e){

    if(e.target.classList.contains("deleteBtn")){

        e.target.parentElement.remove();

        saveTasks();
        updateDashboard();
    }

});