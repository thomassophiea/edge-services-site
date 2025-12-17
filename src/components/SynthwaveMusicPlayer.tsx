import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface Track {
  title: string;
  artist: string;
  url: string;
}

interface SynthwaveMusicPlayerProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SynthwaveMusicPlayer({ isVisible, onClose }: SynthwaveMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tracks - default starts with "Turn Off The Lights"
  const [tracks] = useState<Track[]>([
    {
      title: 'Turn Off The Lights',
      artist: 'Synthwave Collection',
      url: '/music/turn-off-the-lights.mp3'
    },
    {
      title: 'Neon Nights',
      artist: 'Synthwave Dreams',
      url: '/music/neon-nights.mp3'
    },
    {
      title: 'Cyber Highway',
      artist: 'Retro Future',
      url: '/music/cyber-highway.mp3'
    }
  ]);

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => handleNext();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
    setTimeout(() => audioRef.current?.play(), 100);
  };

  const handlePrevious = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
    setTimeout(() => audioRef.current?.play(), 100);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-2 border-pink-500 shadow-[0_0_30px_rgba(255,0,110,0.5)]">
          <CardContent className="p-3 flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePlay}
              className="h-8 w-8 p-0 hover:bg-cyan-500/20"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-cyan-400" />
              ) : (
                <Play className="h-4 w-4 text-cyan-400" />
              )}
            </Button>
            <Music className="h-4 w-4 text-pink-400 animate-pulse" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="h-8 w-8 p-0 hover:bg-cyan-500/20"
            >
              <Maximize2 className="h-3 w-3 text-cyan-400" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-2 border-pink-500 shadow-[0_0_40px_rgba(255,0,110,0.6)] backdrop-blur-sm">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-pink-400" />
              <h3 className="font-bold text-cyan-400 text-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
                MIAMI VICE PLAYER
              </h3>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 hover:bg-cyan-500/20"
              >
                <Minimize2 className="h-3 w-3 text-cyan-400" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-pink-500/20"
              >
                <X className="h-3 w-3 text-pink-400" />
              </Button>
            </div>
          </div>

          {/* Track Info */}
          <div className="text-center space-y-1 py-4 border-y border-pink-500/30">
            <div className="text-lg font-bold text-pink-400 text-shadow-[0_0_10px_rgba(255,0,110,0.8)]">
              {currentTrack.title}
            </div>
            <div className="text-sm text-cyan-300">
              {currentTrack.artist}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-cyan-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrevious}
              className="h-10 w-10 p-0 hover:bg-cyan-500/20"
            >
              <SkipBack className="h-5 w-5 text-cyan-400" />
            </Button>

            <Button
              size="lg"
              onClick={togglePlay}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-[0_0_20px_rgba(255,0,110,0.6)]"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-1" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleNext}
              className="h-10 w-10 p-0 hover:bg-cyan-500/20"
            >
              <SkipForward className="h-5 w-5 text-cyan-400" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="h-8 w-8 p-0 hover:bg-cyan-500/20"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-pink-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-cyan-400" />
              )}
            </Button>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={(val) => setVolume(val[0])}
              className="flex-1"
            />
            <span className="text-xs text-cyan-400 w-8 text-right">{volume}%</span>
          </div>

          {/* Track List Hint */}
          <div className="text-xs text-center text-purple-300/70 pt-2 border-t border-pink-500/30">
            Place your .mp3 files in /public/music/ folder
          </div>
        </CardContent>
      </Card>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={currentTrack.url} />
    </div>
  );
}
