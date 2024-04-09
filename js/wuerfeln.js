/* document.addEventListener("DOMContentLoaded", function() {
    const cube = document.getElementById("cube");

    cube.addEventListener("click", function() {
        cube.classList.add("rotate-animation");
        setTimeout(() => {
            cube.classList.remove("rotate-animation");
            rotateToFront();
        }, 1000); // Adjust duration as needed
    });

    function rotateToFront() {
        cube.style.transform = "rotateY(0deg)"; // Rotate to bring the first side to the front
    }
}); */

document.addEventListener("DOMContentLoaded", function() {
    const cube = document.getElementById("cube");

    cube.addEventListener("click", function() {
        const random1 = Math.floor(Math.random() * 6) + 1 + 6*2; // Zufällige Seite zwischen 1 und 6 auswählen
        const random2 = Math.floor(Math.random() * 6) + 1 + 6*2; // Zufällige Seite zwischen 1 und 6 auswählen
        const degreesToRotateY = 360 * 13 + (90 * (random1 - 1)); // Mindestens 1800 Grad plus die Drehung zur ausgewählten Seite
        const degreesToRotateX = 360 * 17 + (90 * (random2 - 1)); // Mindestens 1800 Grad plus die Drehung zur ausgewählten Seite
        cube.style.transform = `rotateY(${degreesToRotateY}deg) rotateX(${degreesToRotateX}deg)`; // Drehung zum ausgewählten Winkel
        /*cube.style.transform = `rotateX(${degreesToRotateX/2}deg)`; // Drehung zum ausgewählten Winkel 
        cube.style.transform = `rotateY(${degreesToRotateY/2}deg)`; // Drehung zum ausgewählten Winkel
        cube.style.transform = `rotateX(${degreesToRotateX/2}deg)`; // Drehung zum ausgewählten Winkel */
    });
});



