/**
 * "Be a lot cooler if you did" - Dazed and Confused sound effect
 * Plays 3 times when user clicks "Maybe..." in Hello Kitty mode dialog
 */

let playCount = 0;
let audioInstance: HTMLAudioElement | null = null;

export function playCoolerSound() {
  playCount = 0;

  const playNext = () => {
    if (playCount >= 3) {
      console.log('🌿 Finished playing "cooler" sound 3 times');
      return;
    }

    // Create new audio instance for each play
    audioInstance = new Audio('https://www.myinstants.com/media/sounds/be-a-lot-cooler-if-you-did.mp3');
    audioInstance.volume = 0.8;

    audioInstance.play()
      .then(() => {
        playCount++;
        console.log(`🌿 Playing "Be a lot cooler if you did" - ${playCount}/3`);
      })
      .catch((error) => {
        console.error('Failed to play cooler sound:', error);
      });

    // When this play finishes, play the next one
    audioInstance.onended = () => {
      if (playCount < 3) {
        // Small delay between plays
        setTimeout(playNext, 500);
      }
    };
  };

  // Start the sequence
  playNext();
}
