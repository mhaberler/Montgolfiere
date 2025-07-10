import { ref } from "vue";

const ticker = ref(new Date());
const tickerRunning = ref(false);


// Use ReturnType<typeof setInterval> for cross-platform compatibility
let intervalId: any; //ReturnType<typeof setInterval> | undefined;

function startTimer(duration: number = 1000): void {
    if (tickerRunning.value) {
        console.error(`ticker already running`);
        return;
    }

    // The setInterval function returns a number, which is assigned to intervalId.
    intervalId = setInterval(() => {
        ticker.value = new Date();

    }, duration); 
    tickerRunning.value = true;
    console.log("Timer started");
}

function stopTimer(): void {
    if (!tickerRunning.value) {
        console.error(`ticker already stopped`);
        return;
    }
    if (intervalId !== undefined) { // Check if the intervalId has been set
        clearInterval(intervalId); // Stop the timer using its ID
        intervalId = undefined; // Reset the ID to indicate no active timer
        console.log("Timer stopped");
    } else {
        console.log("No timer is currently running.");
    }
    tickerRunning.value = false;
}

export {
    startTimer,
    stopTimer,
    ticker,
    tickerRunning
};