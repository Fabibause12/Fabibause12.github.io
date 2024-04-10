const d1container = document.getElementById("dice_1");
const d2container = document.getElementById('dice_2');
const d3container = document.getElementById("dice_3");
const d4container = document.getElementById('dice_4');
const d5container = document.getElementById('dice_5');

const dice1 = new Dice(d1container);
const dice2 = new Dice(d2container); 
const dice3 = new Dice(d3container);
const dice4 = new Dice(d4container); 
const dice5 = new Dice(d5container);

dice1.roll();
dice2.roll();
dice3.roll();
dice4.roll();
dice5.roll();


function addDice() {
  diceCount++; // Erhöhe die Würfelzählung
  const newDiceContainer = document.createElement("div"); // Erstelle ein neues div-Element für den Würfel-Container
  newDiceContainer.id = "dice_" + diceCount; // Weise dem neuen div-Element eine eindeutige ID zu
  newDiceContainer.classList.add("dice"); // Füge der neuen div-Klasse 'dice' hinzu
  document.querySelector(".dices").appendChild(newDiceContainer); // Füge das neue div-Element dem Container hinzu

  // Erstelle einen neuen Würfel und weise ihm den neuen Container zu
  const newDice = new Dice(newDiceContainer);
}

function removeDice() {
  const lastDiceContainer = document.getElementById("dice_" + diceCount); // Finde den letzten Würfel-Container
  if (lastDiceContainer) {
    lastDiceContainer.remove(); // Entferne den letzten Würfel-Container
    diceCount--; // Reduziere die Würfelzählung
  }
}

/* // Event Listener für den Button zum Hinzufügen eines Würfels
document.getElementById("addDiceBtn").addEventListener("click", addDice);

// Event Listener für den Button zum Entfernen eines Würfels
document.getElementById("removeDiceBtn").addEventListener("click", removeDice); */

document.addEventListener("DOMContentLoaded", function () {
  const cube = document.getElementById("roll");

  cube.addEventListener("click", function () {
    dice1.roll();
    dice2.roll();
    dice3.roll();
    dice4.roll();
    dice5.roll();
  });
});

/* const random1 = Math.floor(Math.random() * 6) + 1 ; // Zufällige Seite zwischen 1 und 6 auswählen
        const random2 = Math.floor(Math.random() * 6) + 1 ; // Zufällige Seite zwischen 1 und 6 auswählen
        const random3 = Math.floor(Math.random() * 6) + 1 ; // Zufällige Seite zwischen 1 und 6 auswählen
        const degreesToRotateX = 360 * 10 + (90 * (random1 - 1));
        const degreesToRotateY = 360 * 10 + (90 * (random2 - 1));
        const degreesToRotateZ = 360 * 10 + (90 * (random3 - 1)); 
        cube.style.transform = `rotateX(${degreesToRotateX}deg) rotateY(${degreesToRotateY}deg) rotateZ(${degreesToRotateX}deg)`; */ // Drehung zum ausgewählten Winkel
/*cube.style.transform = `rotateX(${degreesToRotateX/2}deg)`; // Drehung zum ausgewählten Winkel 
        cube.style.transform = `rotateY(${degreesToRotateY/2}deg)`; // Drehung zum ausgewählten Winkel
        cube.style.transform = `rotateX(${degreesToRotateX/2}deg)`; // Drehung zum ausgewählten Winkel */
