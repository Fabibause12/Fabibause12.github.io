document.addEventListener("DOMContentLoaded", function() {
    const rollButton = document.getElementById("roll");
    const dicesContainer = document.querySelector('.dices');

    // Event Listener für den Button zum Hinzufügen eines Würfels
    document.getElementById("addDiceBtn").addEventListener("click", addDice);

    // Event Listener für den Button zum Entfernen eines Würfels
    document.getElementById("removeDiceBtn").addEventListener("click", removeDice);

    // Event Listener für den "roll"-Button
    rollButton.addEventListener("click", function() {
        // Alle Würfel finden
        const allDiceContainers = document.querySelectorAll('.dice');
        
        // Für jeden Würfel rollen
        allDiceContainers.forEach(diceContainer => {
            const dice = diceContainer.dataset.diceObject;
            if (dice) {
                dice.roll();
            }
        });
    });

    // Funktion zum Hinzufügen eines neuen Würfels
    function addDice() {
        const newDiceContainer = document.createElement('div');
        const diceCount = dicesContainer.childElementCount + 1;
        newDiceContainer.id = 'dice_' + diceCount;
        newDiceContainer.classList.add('dice');
        dicesContainer.appendChild(newDiceContainer);
        const newDice = new Dice(newDiceContainer);
        newDiceContainer.dataset.diceObject = newDice; // Das Dice-Objekt direkt speichern
    

    // Funktion zum Entfernen des letzten Würfels
    function removeDice() {
        const lastDiceContainer = dicesContainer.lastElementChild;
        if (lastDiceContainer) {
            lastDiceContainer.remove();
        }
    }
});
