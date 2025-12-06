/**
 * Spaceballs "That's the same code on my luggage" Easter Egg
 * Plays when user logs in
 */

export function playSpaceballsSound() {
  console.log('🧳 Playing Spaceballs login sound...');

  // Spaceballs "That's amazing, I've got the same combination on my luggage!"
  // Using multiple fallback URLs to ensure it plays
  const audioUrls = [
    'https://www.myinstants.com/media/sounds/spaceballs-1-2-3-4-5.mp3',
    'https://www.soundboard.com/handler/DownLoadTrack.ashx?cliptitle=Spaceballs+12345&filename=mz/MzgwODMxNTIzMzg1ODM3_qLZrPfT1TM.mp3',
  ];

  const audio = new Audio(audioUrls[0]);
  audio.volume = 0.8;

  audio.play()
    .then(() => {
      console.log('🧳 "1-2-3-4-5? That\'s amazing! I\'ve got the same combination on my luggage!"');
    })
    .catch((error) => {
      console.error('❌ Failed to play Spaceballs sound:', error);
      console.log('🧳 Trying fallback URL...');

      // Try fallback URL
      const fallbackAudio = new Audio(audioUrls[1]);
      fallbackAudio.volume = 0.8;
      fallbackAudio.play()
        .then(() => {
          console.log('🧳 Fallback URL worked!');
        })
        .catch(e => {
          console.error('❌ Fallback also failed:', e);
        });
    });
}
