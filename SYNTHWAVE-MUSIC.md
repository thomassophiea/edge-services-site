# 🌆 Synthwave Music Player Setup

The Synthwave theme includes a retro music player that can play your .mp3 files!

## 📁 How to Add Your Music

1. Create a `music` folder in the `public` directory:
   ```
   public/
   └── music/
       ├── track1.mp3
       ├── track2.mp3
       └── track3.mp3
   ```

2. Add your .mp3 files to the `public/music/` folder

3. The music player will automatically detect and play these tracks when you're in Synthwave mode!

## 🎵 Default Tracks

The player is configured with 3 placeholder tracks:
- **Neon Nights** by Synthwave Dreams (`/music/track1.mp3`)
- **Cyber Highway** by Retro Future (`/music/track2.mp3`)
- **Sunset Drive** by Wave Rider (`/music/track3.mp3`)

## 🎮 Music Player Features

- **Play/Pause**: Control playback
- **Skip Forward/Back**: Navigate between tracks
- **Volume Control**: Adjust or mute the volume
- **Seek Bar**: Jump to any point in the track
- **Minimize**: Collapse the player to a small widget
- **Auto-advance**: Automatically plays the next track when one ends

## 🎨 Customization

To add more tracks or change track info, edit:
`src/components/SynthwaveMusicPlayer.tsx`

Look for the `tracks` array and add your own:
```typescript
const [tracks] = useState<Track[]>([
  {
    title: 'Your Track Name',
    artist: 'Your Artist Name',
    url: '/music/your-file.mp3'
  },
  // Add more tracks...
]);
```

## 🌟 Recommended Synthwave Artists

- Gunship
- The Midnight
- FM-84
- Timecop1983
- Perturbator
- Carpenter Brut
- Dance with the Dead
- Lazerhawk

Enjoy your neon-soaked journey! 🎶✨
