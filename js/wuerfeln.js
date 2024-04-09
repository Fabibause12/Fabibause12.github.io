// Funktionen für die Auswahl der Anzahl der Würfel

function rollDice() {
    // Funktion zum Rollen eines einzelnen Würfels
    return Math.floor(Math.random() * 6) + 1; // Zufällige Zahl zwischen 1 und 6
}

function rollDiceMultiple() {
    var numDice = parseInt(document.getElementById('numDice').value); // Anzahl der Würfel
    var diceResults = document.getElementById('diceResults');
    diceResults.innerHTML = ''; // Zurücksetzen der vorherigen Ergebnisse
    for (var i = 0; i < numDice; i++) {
        var result = rollDice();
        var diceDiv = document.createElement('div');
        diceDiv.className = 'dice';
        diceDiv.innerText = result;
        diceResults.appendChild(diceDiv);
    }
}