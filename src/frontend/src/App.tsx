import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  BookOpen,
  Cake,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit2,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  Heart,
  HelpCircle,
  ImageIcon,
  Lightbulb,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  MicOff,
  Music,
  Music2,
  Pencil,
  Phone,
  Plus,
  Send,
  Settings,
  Shield,
  Star,
  Trash2,
  User,
  Users,
  Video,
  X,
  Youtube,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { backendInterface } from "./backend.d.ts";
import type {
  Birthday,
  ImportantMessage,
  MeetLink,
  Message,
  StarOfTheMonth,
} from "./backend.d.ts";
import { useActor } from "./hooks/useActor";
import { loadAllMediaByPrefix, loadMedia, saveMedia } from "./mediaDB";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "welcome"
  | "register"
  | "account-ready"
  | "home"
  | "messages"
  | "stars"
  | "birthdays"
  | "meet"
  | "important-messages"
  | "your-ideas"
  | "photos"
  | "whatsapp"
  | "youtube"
  | "calendar"
  | "school-works"
  | "rules"
  | "quiz"
  | "games"
  | "attendance"
  | "prayer"
  | "indian-songs"
  | "calling"
  | "group-chat"
  | "home-works"
  | "notifications"
  | "all-persons"
  | "messaging-hub"
  | "settings";

interface NotificationItem {
  id: string;
  boxName: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface UserData {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  password: string;
}

// ─── Actor Context ────────────────────────────────────────────────────────────

const ActorContext = createContext<backendInterface | null>(null);

function useBackendActor(): backendInterface | null {
  return useContext(ActorContext);
}

// ─── Shared AudioContext (survives across calls) ──────────────────────────────

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Resume AudioContext (call after any user gesture)
function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// ─── Fireworks Sound ──────────────────────────────────────────────────────────

function playFireworkSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    resume
      .then(() => {
        const now = ctx.currentTime;

        // Low-frequency boom
        const osc = ctx.createOscillator();
        const boomGain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        boomGain.gain.setValueAtTime(0.9, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(boomGain);
        boomGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        // White noise crackle / sparkle
        const bufferSize = Math.floor(ctx.sampleRate * 0.25);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noiseSource.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start(now);

        // High whistle rise before boom
        const whistle = ctx.createOscillator();
        const whistleGain = ctx.createGain();
        whistle.type = "sine";
        whistle.frequency.setValueAtTime(400, now);
        whistle.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        whistleGain.gain.setValueAtTime(0.3, now);
        whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        whistle.connect(whistleGain);
        whistleGain.connect(ctx.destination);
        whistle.start(now);
        whistle.stop(now + 0.2);
      })
      .catch(() => {});
  } catch {
    // Silently ignore — audio not critical
  }
}

// ─── Fireworks Canvas ─────────────────────────────────────────────────────────

function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      size: number;
    };

    const particles: Particle[] = [];
    const colors = [
      "#FFD700",
      "#FFA500",
      "#FF6B6B",
      "#A855F7",
      "#60A5FA",
      "#34D399",
      "#F472B6",
      "#FBBF24",
      "#C084FC",
      "#FB923C",
    ];

    const createBurst = (x: number, y: number) => {
      const count = 60;
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    };

    const burstPositions = [
      [0.2, 0.25],
      [0.5, 0.15],
      [0.8, 0.3],
      [0.15, 0.5],
      [0.85, 0.55],
      [0.4, 0.7],
      [0.65, 0.2],
      [0.35, 0.4],
      [0.7, 0.6],
    ];

    let burstIdx = 0;
    const burstTimer = setInterval(() => {
      if (burstIdx < burstPositions.length) {
        const pos = burstPositions[burstIdx];
        createBurst(canvas.width * pos[0], canvas.height * pos[1]);
        burstIdx++;
      } else {
        clearInterval(burstTimer);
      }
    }, 200);

    let animId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(10, 8, 25, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.alpha -= 0.012;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearInterval(burstTimer);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ─── Background Music Player ──────────────────────────────────────────────────

// A gentle looping ambient melody hosted on a public CDN
const MUSIC_URL =
  "https://cdn.pixabay.com/audio/2023/10/09/audio_2e5c013c50.mp3";

function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    const onCanPlay = () => setReady(true);
    audio.addEventListener("canplaythrough", onCanPlay);

    return () => {
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  return (
    <motion.button
      onClick={toggle}
      className="fixed bottom-5 left-4 z-50 w-11 h-11 rounded-full bg-card border border-gold/40 flex items-center justify-center shadow-lg hover:border-gold transition-all"
      title={playing ? "Pause music" : "Play music"}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: ready ? 1 : 0.4, y: 0 }}
      transition={{ delay: 1 }}
    >
      {playing ? (
        <Music2 className="w-5 h-5 text-gold animate-pulse" />
      ) : (
        <Music className="w-5 h-5 text-gold/60" />
      )}
    </motion.button>
  );
}

// ─── Stars Background (3D Warp Starfield) ────────────────────────────────────

function StarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const NUM_STARS = 200;
    const FOCAL = 400;
    const SPEED = 1.5;
    const RANGE = 500;

    type Star3D = { x: number; y: number; z: number };

    const stars: Star3D[] = Array.from({ length: NUM_STARS }, () => ({
      x: (Math.random() - 0.5) * RANGE * 2,
      y: (Math.random() - 0.5) * RANGE * 2,
      z: Math.random() * RANGE,
    }));

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const star of stars) {
        star.z -= SPEED;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * RANGE * 2;
          star.y = (Math.random() - 0.5) * RANGE * 2;
          star.z = RANGE;
        }

        const sx = (star.x / star.z) * FOCAL + cx;
        const sy = (star.y / star.z) * FOCAL + cy;

        // Only draw stars that are within canvas bounds
        if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height)
          continue;

        const depth = 1 - star.z / RANGE; // 0 = far, 1 = close
        const size = Math.max(0.4, depth * 3);
        const opacity = 0.1 + depth * 0.9;

        // Color: far = blue-white (#e0e8ff), close = gold (#FFD700)
        // Interpolate between the two
        const r = Math.round(224 + (255 - 224) * depth); // 224 -> 255
        const g = Math.round(232 + (215 - 232) * depth); // 232 -> 215
        const b = Math.round(255 + (0 - 255) * depth); // 255 -> 0

        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
        ctx.fill();

        // Add a glow halo on the closest stars
        if (depth > 0.7) {
          ctx.beginPath();
          ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${opacity * 0.15})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ─── Screen 1: Splash / Loading ────────────────────────────────────────────────

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (count >= 100 && !completedRef.current) {
      completedRef.current = true;
      // Skip fireworks and welcome screen — go straight to homepage
      onComplete();
    }
  }, [count, onComplete]);

  const circleSize = Math.max(40, (count / 100) * 280);

  return (
    <div
      className="relative min-h-screen celestial-bg flex items-center justify-center overflow-hidden"
      onClick={resumeAudio}
      onKeyDown={resumeAudio}
    >
      <StarsBackground />

      <div className="flex flex-col items-center gap-8 z-10">
        <motion.div
          className="rounded-full border-2 border-gold flex items-center justify-center glow-gold"
          style={{
            width: circleSize,
            height: circleSize,
            background:
              "radial-gradient(circle at center, oklch(0.20 0.08 75 / 0.3), oklch(0.10 0.03 285 / 0.8))",
            transition: "width 0.03s linear, height 0.03s linear",
          }}
        >
          <span
            className="font-display text-gold font-bold"
            style={{ fontSize: Math.max(16, circleSize * 0.28) }}
          >
            {count}
          </span>
        </motion.div>
        <div className="text-muted-foreground font-sans text-sm tracking-widest uppercase">
          Loading Our Heaven
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Welcome / Create Account ────────────────────────────────────────

function WelcomeScreen({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <div
      className="relative min-h-screen celestial-bg flex items-center justify-center overflow-hidden"
      onClick={resumeAudio}
      onKeyDown={resumeAudio}
    >
      <StarsBackground />
      <motion.div
        className="z-10 flex flex-col items-center gap-8 text-center px-8 max-w-md w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.img
          src="/assets/generated/our-heaven-logo-transparent.dim_200x200.png"
          alt="Our Heaven"
          className="w-28 h-28 animate-float"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "backOut" }}
        />

        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gold text-glow-gold mb-3">
            Our Heaven
          </h1>
          <p className="text-muted-foreground text-lg font-sans">
            Chat, learn, and grow together in our sacred space
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {[
            "💬 Connect with friends",
            "🎓 Grow through education",
            "⭐ Celebrate each other",
          ].map((item, i) => (
            <motion.div
              key={item}
              className="card-celestial rounded-lg px-4 py-3 text-sm text-foreground/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
            >
              {item}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full"
        >
          <Button
            onClick={onCreateAccount}
            className="w-full h-14 text-lg font-display font-semibold bg-gold text-deep-space hover:bg-accent rounded-xl glow-gold-sm transition-all duration-300 hover:scale-[1.02]"
          >
            Create Account
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Screen 3: Registration Form ────────────────────────────────────────────────

interface RegistrationFormProps {
  onNext: (data: UserData) => void;
}

function RegistrationForm({ onNext }: RegistrationFormProps) {
  const actor = useBackendActor();
  const [form, setForm] = useState<UserData>({
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UserData>>({});

  const validate = () => {
    const e: Partial<UserData> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.dob) e.dob = "Required";
    if (!form.phone.trim() || form.phone.length < 7)
      e.phone = "Enter valid phone";
    if (!form.password || form.password.length < 6)
      e.password = "Min 6 characters";
    return e;
  };

  const handleNext = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    try {
      if (actor) {
        try {
          await actor.registerAccount(
            form.firstName,
            form.lastName,
            form.dob,
            form.phone,
            form.password,
          );
        } catch {
          // Backend may reject new users due to permission rules - continue anyway, data stored locally
        }
      }
      onNext(form);
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const update =
    (field: keyof UserData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      setErrors((p) => ({ ...p, [field]: undefined }));
    };

  const fields: Array<{
    key: keyof UserData;
    label: string;
    type: string;
    placeholder: string;
  }> = [
    {
      key: "firstName",
      label: "First Name",
      type: "text",
      placeholder: "Enter your first name",
    },
    {
      key: "lastName",
      label: "Last Name",
      type: "text",
      placeholder: "Enter your last name",
    },
    { key: "dob", label: "Date of Birth", type: "date", placeholder: "" },
    {
      key: "phone",
      label: "Phone Number",
      type: "tel",
      placeholder: "+1 234 567 8900",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      placeholder: "At least 6 characters",
    },
  ];

  return (
    <div className="relative min-h-screen celestial-bg flex items-center justify-center overflow-hidden py-8">
      <StarsBackground />
      <motion.div
        className="z-10 w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <img
            src="/assets/generated/our-heaven-logo-transparent.dim_200x200.png"
            alt="Logo"
            className="w-14 h-14 mx-auto mb-4"
          />
          <h1 className="font-display text-3xl font-bold text-gold">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join Our Heaven today
          </p>
        </div>

        <div className="card-celestial rounded-2xl p-6 space-y-4">
          {fields.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Label className="text-foreground/80 text-sm mb-1.5 block">
                {field.label}
              </Label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={update(field.key)}
                className={`bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-gold focus:border-gold h-11 ${
                  errors[field.key] ? "border-destructive" : ""
                }`}
              />
              {errors[field.key] && (
                <p className="text-destructive text-xs mt-1">
                  {errors[field.key]}
                </p>
              )}
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-2"
          >
            <Button
              onClick={handleNext}
              disabled={loading}
              className="w-full h-12 bg-gold text-deep-space hover:bg-accent font-display font-semibold text-base rounded-xl glow-gold-sm transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {loading ? "Creating Account..." : "Next"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Screen 4: Account Ready ───────────────────────────────────────────────────

function AccountReadyScreen({
  firstName,
  onComplete,
}: {
  firstName: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    // Play firework sounds on account success
    resumeAudio();
    const soundTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 6; i++) {
      soundTimers.push(setTimeout(() => playFireworkSound(), i * 300));
    }
    const t = setTimeout(onComplete, 3000);
    return () => {
      soundTimers.forEach(clearTimeout);
      clearTimeout(t);
    };
  }, [onComplete]);

  return (
    <div className="relative min-h-screen celestial-bg flex items-center justify-center overflow-hidden">
      <StarsBackground />
      <FireworksCanvas />
      <motion.div
        className="z-10 flex flex-col items-center gap-6 text-center px-8"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "backOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "backOut" }}
        >
          <CheckCircle2 className="w-24 h-24 text-gold drop-shadow-[0_0_20px_oklch(0.80_0.18_75/0.6)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gold text-glow-gold mb-3">
            Welcome to Our Heaven, {firstName}!
          </h1>
          <p className="text-foreground/80 text-lg font-sans">
            Your account is ready 🌟
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Screen 6: Home Page ────────────────────────────────────────────────────────

interface HomeScreenProps {
  user: UserData;
  onNavigate: (screen: Screen) => void;
  onUpdateUser: (u: UserData) => void;
  unreadCount?: number;
  notificationCount?: number;
}

const LEADERS = [
  "aaron",
  "jojo",
  "nevveen",
  "nevveen ps",
  "aaron david",
  "aaron david jojo",
];

function isLeader(firstName: string, lastName?: string): boolean {
  const first = firstName.trim().toLowerCase();
  const full = lastName ? `${first} ${lastName.trim().toLowerCase()}` : first;
  return (
    LEADERS.includes(first) ||
    LEADERS.includes(full) ||
    LEADERS.some((l) => first.startsWith(l) || l.startsWith(first))
  );
}

function HomeScreen({
  user,
  onNavigate,
  onUpdateUser,
  unreadCount = 0,
  notificationCount = 0,
}: HomeScreenProps) {
  const actor = useBackendActor();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      await actor.updateAccount(
        user.phone,
        editForm.firstName,
        editForm.lastName,
        editForm.dob,
        editForm.password,
      );
      onUpdateUser({ ...editForm, phone: user.phone });
      setEditOpen(false);
      toast.success("Account updated!");
    } catch {
      toast.error("Failed to update account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10 flex-shrink-0"
            title="Settings"
            data-ocid="home.settings.open_modal_button"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 justify-center">
            <img
              src="/assets/generated/our-heaven-logo-transparent.dim_200x200.png"
              alt="Our Heaven"
              className="w-12 h-12"
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-gold">
                Our Heaven
              </h1>
              <p className="text-muted-foreground text-xs">Your sacred space</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEditForm({ ...user });
              setEditOpen(true);
            }}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10 flex-shrink-0"
            title="Edit account"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Account Card */}
        <motion.div
          className="card-celestial rounded-2xl p-5 mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center glow-gold-sm">
              <User className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p
                className={`text-sm font-semibold ${isLeader(user.firstName, user.lastName) ? "text-gold" : "text-muted-foreground"}`}
              >
                {isLeader(user.firstName, user.lastName) ? "Leader" : "Member"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Date of Birth", value: user.dob },
              { label: "Phone", value: user.phone },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/30 rounded-xl p-3">
                <p className="text-muted-foreground text-xs mb-1">{label}</p>
                <p className="text-foreground font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature Boxes — 4-column grid grouped by section */}
        {(
          [
            {
              title: "Community",
              emoji: "💬",
              items: [
                {
                  screen: "all-persons",
                  icon: Users,
                  label: "All Persons",
                  badge: 0,
                },
                {
                  screen: "messaging-hub",
                  icon: MessageSquare,
                  label: "Messages",
                  badge: unreadCount,
                },
                {
                  screen: "group-chat",
                  icon: MessageCircle,
                  label: "Group Chat",
                  badge: 0,
                },
                {
                  screen: "your-ideas",
                  icon: Lightbulb,
                  label: "Your Ideas",
                  badge: 0,
                },
                {
                  screen: "notifications",
                  icon: Bell,
                  label: "Notifications",
                  badge: notificationCount,
                },
                {
                  screen: "important-messages",
                  icon: Bell,
                  label: "Important Messages",
                  badge: 0,
                },
                {
                  screen: "whatsapp",
                  icon: MessageCircle,
                  label: "WhatsApp Group",
                  badge: 0,
                },
              ],
            },
            {
              title: "Learning",
              emoji: "📚",
              items: [
                {
                  screen: "quiz",
                  icon: HelpCircle,
                  label: "Quiz Box",
                  badge: 0,
                },
                {
                  screen: "school-works",
                  icon: GraduationCap,
                  label: "School Works",
                  badge: 0,
                },
                {
                  screen: "home-works",
                  icon: BookOpen,
                  label: "Home Works",
                  badge: 0,
                },
                {
                  screen: "calendar",
                  icon: CalendarDays,
                  label: "Dates & Calendar",
                  badge: 0,
                },
                {
                  screen: "attendance",
                  icon: ClipboardList,
                  label: "Attendance & Level",
                  badge: 0,
                },
              ],
            },
            {
              title: "Activities",
              emoji: "🎮",
              items: [
                { screen: "games", icon: Gamepad2, label: "Games", badge: 0 },
                { screen: "prayer", icon: Heart, label: "Prayer", badge: 0 },
                {
                  screen: "indian-songs",
                  icon: Music2,
                  label: "Indian Songs & Prayers",
                  badge: 0,
                },
                {
                  screen: "photos",
                  icon: ImageIcon,
                  label: "Photos",
                  badge: 0,
                },
                {
                  screen: "youtube",
                  icon: Youtube,
                  label: "YouTube Channel",
                  badge: 0,
                },
              ],
            },
            {
              title: "People",
              emoji: "👥",
              items: [
                { screen: "rules", icon: Shield, label: "Rules", badge: 0 },
                {
                  screen: "birthdays",
                  icon: Cake,
                  label: "Birthday Dates",
                  badge: 0,
                },
                {
                  screen: "stars",
                  icon: Star,
                  label: "Star of the Month",
                  badge: 0,
                },
                { screen: "meet", icon: Video, label: "Meet", badge: 0 },
                { screen: "calling", icon: Phone, label: "Calling", badge: 0 },
              ],
            },
            {
              title: "Settings",
              emoji: "⚙️",
              items: [
                {
                  screen: "settings" as Screen,
                  icon: Settings,
                  label: "Settings",
                  badge: 0,
                },
              ],
            },
          ] as Array<{
            title: string;
            emoji: string;
            items: Array<{
              screen: Screen;
              icon: React.ComponentType<{ className?: string }>;
              label: string;
              badge: number;
            }>;
          }>
        ).map((section, si) => (
          <div key={section.title} className="mb-5">
            {/* Section Header */}
            <motion.div
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + si * 0.06 }}
            >
              <span className="text-base">{section.emoji}</span>
              <span className="font-display font-bold text-gold text-sm tracking-wide uppercase">
                {section.title}
              </span>
              <div className="flex-1 h-px bg-gold/20 ml-1" />
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2">
              {section.items.map(({ screen, icon: Icon, label, badge }, i) => (
                <motion.button
                  key={screen}
                  type="button"
                  onClick={() =>
                    screen === "settings"
                      ? setSettingsOpen(true)
                      : onNavigate(screen)
                  }
                  className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 bg-white/10 backdrop-blur-sm border border-white/15 hover:border-gold/50 hover:bg-gold/10 transition-all duration-200 active:scale-95 text-center"
                  style={{ minHeight: 76 }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.2 + si * 0.06 + i * 0.04,
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  whileTap={{ scale: 0.93 }}
                  data-ocid={`home.${screen.replace(/-/g, "_")}.button`}
                >
                  {/* Badge */}
                  {badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-gold" />
                  </div>
                  {/* Label */}
                  <span className="text-[10px] leading-tight text-foreground font-medium px-0.5 line-clamp-2">
                    {label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center text-muted-foreground text-xs mt-8">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="text-gold/70 hover:text-gold transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </div>

      {/* Scroll to top button */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-5 right-4 z-50 w-11 h-11 rounded-full bg-card border border-gold/40 flex items-center justify-center shadow-lg hover:border-gold transition-all hover:bg-gold/10"
        title="Scroll to top"
      >
        <ArrowUp className="w-5 h-5 text-gold" />
      </button>

      {/* Edit Account Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Edit Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(["firstName", "lastName", "dob", "password"] as const).map(
              (key) => (
                <div key={key}>
                  <Label className="text-muted-foreground text-sm capitalize">
                    {key === "dob"
                      ? "Date of Birth"
                      : key === "firstName"
                        ? "First Name"
                        : key === "lastName"
                          ? "Last Name"
                          : "Password"}
                  </Label>
                  <Input
                    type={
                      key === "password"
                        ? "password"
                        : key === "dob"
                          ? "date"
                          : "text"
                    }
                    value={editForm[key]}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, [key]: e.target.value }))
                    }
                    className="bg-input border-border mt-1"
                  />
                </div>
              ),
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !actor}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-t border-gold/30 rounded-t-2xl max-h-[55vh] overflow-y-auto"
          data-ocid="settings.sheet"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-gold text-lg">
              Settings
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-6">
            {/* Edit Profile */}
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setEditForm({ ...user });
                setEditOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl card-celestial hover:border-gold/40 transition-all text-left"
              data-ocid="settings.edit_profile.button"
            >
              <User className="w-5 h-5 text-gold" />
              <div>
                <p className="font-display font-semibold text-foreground text-sm">
                  Edit Profile
                </p>
                <p className="text-muted-foreground text-xs">
                  Update your account details
                </p>
              </div>
            </button>

            {/* Change Password */}
            <div className="px-4 py-3 rounded-xl card-celestial space-y-2">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gold" />
                <p className="font-display font-semibold text-foreground text-sm flex-1">
                  Change Password
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="text-gold border border-gold/30 hover:bg-gold/10 rounded-lg text-xs h-8"
                  data-ocid="settings.change_password.toggle"
                >
                  {showChangePassword ? "Cancel" : "Change"}
                </Button>
              </div>
              {showChangePassword && (
                <div className="flex gap-2 pt-1">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="flex-1 bg-input border-border text-foreground h-10 rounded-xl text-sm"
                    data-ocid="settings.new_password.input"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newPassword.length < 6) {
                        toast.error("Password must be at least 6 characters");
                        return;
                      }
                      onUpdateUser({ ...user, password: newPassword });
                      setNewPassword("");
                      setShowChangePassword(false);
                      toast.success("Password updated!");
                    }}
                    className="bg-gold text-deep-space hover:bg-accent rounded-xl h-10 text-sm"
                    data-ocid="settings.save_password.button"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl card-celestial">
              <Bell className="w-5 h-5 text-gold" />
              <div className="flex-1">
                <p className="font-display font-semibold text-foreground text-sm">
                  Notifications
                </p>
                <p className="text-muted-foreground text-xs">
                  Enable message notifications
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-ocid="settings.notifications.switch"
              />
            </div>

            {/* Log Out */}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("our-heaven-user");
                setSettingsOpen(false);
                window.location.reload();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-all text-left"
              data-ocid="settings.logout.button"
            >
              <X className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-display font-semibold text-destructive text-sm">
                  Log Out
                </p>
                <p className="text-muted-foreground text-xs">
                  Sign out of your account
                </p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-page Header ───────────────────────────────────────────────────────────

function SubPageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
      <h1 className="font-display text-xl font-bold text-gold">{title}</h1>
      <Button
        size="icon"
        variant="ghost"
        onClick={onBack}
        className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
        title="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Chat Attachment Menu ──────────────────────────────────────────────────────

interface ChatMediaMessage {
  type: "image" | "voice" | "video";
  content: string; // data URL for image, blob URL for voice
  mimeType: string;
  name: string;
}

// ─── Microphone Blocked Dialog ──────────────────────────────────────────────
function MicrophoneBlockedDialog({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason: "denied" | "no-https" | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm border-amber-500/30 bg-gray-950 text-amber-50"
        data-ocid="mic.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <span>🎤</span>{" "}
            {reason === "no-https"
              ? "Secure Connection Required"
              : "Microphone Blocked"}
          </DialogTitle>
          <DialogDescription className="text-amber-100/70">
            {reason === "no-https"
              ? "Voice recording requires a secure HTTPS connection."
              : "Your browser has blocked microphone access for this app."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm text-amber-100/90">
          {reason === "no-https" ? (
            <p>Please contact the app owner to enable HTTPS, then try again.</p>
          ) : (
            <>
              <p className="font-semibold text-amber-300">
                To fix this, follow these steps:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Tap the{" "}
                  <span className="rounded bg-amber-900/40 px-1 font-mono">
                    🔒
                  </span>{" "}
                  lock icon in your browser's address bar.
                </li>
                <li>
                  Find <strong>Microphone</strong> in the permissions list.
                </li>
                <li>
                  Change it from <em>Block</em> to{" "}
                  <strong className="text-amber-400">Allow</strong>.
                </li>
                <li>Refresh the page and tap the microphone button again.</li>
              </ol>
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-amber-500 text-black hover:bg-amber-400"
            data-ocid="mic.close_button"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useVoiceRecorder(onDone: (msg: ChatMediaMessage) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micBlockedReason, setMicBlockedReason] = useState<
    "denied" | "no-https" | null
  >(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicBlockedReason("no-https");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          onDone({
            type: "voice",
            content: dataUrl,
            mimeType: "audio/webm",
            name: "voice-message.webm",
          });
        };
        reader.readAsDataURL(blob);
        for (const t of stream.getTracks()) t.stop();
        setRecording(false);
        setSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setMicBlockedReason("denied");
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          toast.error("No microphone found on this device.");
        } else {
          toast.error(`Could not access microphone: ${err.message}`);
        }
      } else {
        toast.error(
          "Could not start recording. Please allow microphone access.",
        );
      }
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return {
    recording,
    seconds,
    start,
    stop,
    micBlockedReason,
    clearMicBlocked: () => setMicBlockedReason(null),
  };
}

interface ChatInputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onMediaSend: (msg: ChatMediaMessage) => void;
  ocidPrefix: string;
}

function ChatInputBar({
  input,
  setInput,
  onSend,
  sending,
  onMediaSend,
  ocidPrefix,
}: ChatInputBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = () => {
        onMediaSend({
          type: "video",
          content: reader.result as string,
          mimeType: file.type,
          name: file.name,
        });
        setMenuOpen(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read video. Please try again.");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to load video. Please try again.");
    }
    e.target.value = "";
  };

  const {
    recording,
    seconds,
    start: startRecording,
    stop: stopRecording,
    micBlockedReason,
    clearMicBlocked,
  } = useVoiceRecorder((msg) => {
    onMediaSend(msg);
    setMenuOpen(false);
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = () => {
        onMediaSend({
          type: "image",
          content: reader.result as string,
          mimeType: file.type,
          name: file.name,
        });
        setMenuOpen(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read photo. Please try again.");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to load photo. Please try again.");
    }
    e.target.value = "";
  };

  return (
    <div className="relative flex gap-2 pb-6 flex-shrink-0">
      <MicrophoneBlockedDialog
        open={micBlockedReason !== null}
        onClose={clearMicBlocked}
        reason={micBlockedReason}
      />
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
        data-ocid={`${ocidPrefix}.photo_upload.input`}
      />

      {/* Hidden video input */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoSelect}
        data-ocid={`${ocidPrefix}.video_upload_button`}
      />

      {/* Attachment popup menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-20 left-0 z-30 card-celestial border border-gold/30 rounded-2xl p-3 shadow-xl min-w-[180px]"
          >
            <p className="text-muted-foreground text-xs font-medium mb-2 px-1">
              Send attachment
            </p>

            {/* Send Photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gold/10 transition-colors text-left"
              data-ocid={`${ocidPrefix}.send_photo.button`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-foreground text-sm font-medium">Photo</span>
            </button>

            {/* Voice Message */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                recording
                  ? "bg-red-500/10 hover:bg-red-500/20"
                  : "hover:bg-gold/10"
              }`}
              data-ocid={`${ocidPrefix}.voice_record.button`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${recording ? "bg-red-500/30" : "bg-green-500/20"}`}
              >
                {recording ? (
                  <MicOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Mic className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div>
                <span className="text-foreground text-sm font-medium block">
                  {recording ? "Stop recording" : "Voice message"}
                </span>
                {recording && (
                  <span className="text-red-400 text-xs animate-pulse">
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                    {String(seconds % 60).padStart(2, "0")} recording…
                  </span>
                )}
              </div>
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={() => videoFileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gold/10 transition-colors text-left"
              data-ocid={`${ocidPrefix}.video_upload_button`}
            >
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-foreground text-sm font-medium">Video</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus/Attach Button */}
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className={`flex-shrink-0 w-12 h-12 rounded-xl border transition-all flex items-center justify-center ${
          menuOpen
            ? "bg-gold text-deep-space border-gold"
            : "bg-card border-gold/30 text-gold hover:bg-gold/10 hover:border-gold"
        }`}
        title="Attach photo or voice"
        data-ocid={`${ocidPrefix}.attach.button`}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>

      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Type a message..."
        className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12 focus:border-gold"
        data-ocid={`${ocidPrefix}.message.input`}
        onClick={() => setMenuOpen(false)}
      />
      <Button
        onClick={onSend}
        disabled={sending || !input.trim()}
        className="bg-gold text-deep-space hover:bg-accent rounded-xl h-12 w-12 p-0 flex-shrink-0"
        data-ocid={`${ocidPrefix}.send.button`}
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

// Helper: render a chat message bubble that may contain image or voice
const TEXT_COLORS = [
  "inherit",
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98FB98",
];

function ChatBubble({
  msg,
  isOwn,
  senderName,
  time,
  onDelete,
}: {
  msg: { content: string; sender: string };
  isOwn: boolean;
  senderName: string;
  time: string;
  onDelete?: () => void;
}) {
  const isImageData = msg.content.startsWith("data:image");
  const isVideoData = msg.content.startsWith("data:video");
  const isVoiceBlob =
    msg.content.startsWith("blob:") ||
    msg.content.startsWith("[voice]") ||
    msg.content.startsWith("data:audio");
  const [colorIdx, setColorIdx] = useState(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => {
      setColorIdx((i) => (i + 1) % TEXT_COLORS.length);
    }, 3000);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {!isOwn && (
        <span className="text-gold text-xs font-medium mb-1 ml-1">
          {senderName}
        </span>
      )}
      <div
        className={`max-w-[75%] rounded-2xl overflow-hidden select-none ${
          isOwn
            ? "bg-gold text-deep-space rounded-tr-sm"
            : "card-celestial text-foreground rounded-tl-sm"
        }`}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isImageData ? (
          <img
            src={msg.content}
            alt="sent"
            className="max-w-full max-h-48 object-contain block"
            draggable={false}
          />
        ) : isVideoData ? (
          /* biome-ignore lint/a11y/useMediaCaption: user-uploaded video, no transcript available */
          <video
            controls
            src={msg.content}
            className="max-w-full max-h-48 block rounded"
          />
        ) : isVoiceBlob ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Mic className="w-4 h-4 flex-shrink-0" />
            {/* biome-ignore lint/a11y/useMediaCaption: voice message playback, no transcript available */}
            <audio
              controls
              src={
                msg.content.startsWith("[voice]")
                  ? msg.content.replace("[voice]", "")
                  : msg.content
              }
              className="h-8 max-w-[160px]"
            />
          </div>
        ) : (
          <p
            className="px-4 py-2.5 text-sm"
            style={{ color: TEXT_COLORS[colorIdx] }}
          >
            {msg.content}
          </p>
        )}
      </div>
      <div
        className={`flex items-center gap-2 mt-1 mx-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        <span className="text-muted-foreground text-xs">{time}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete message"
            className="text-destructive hover:text-destructive/80 transition-colors p-0.5 rounded"
            data-ocid="chat.delete_button"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Screen 7: Messages ────────────────────────────────────────────────────────

function MessagesScreen({
  user,
  onBack,
}: {
  user: UserData;
  onBack: () => void;
}) {
  const actor = useBackendActor();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [allSenders, setAllSenders] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [localMediaMsgs, setLocalMediaMsgs] = useState<
    Array<{ id: string; sender: string; content: string; time: string }>
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // localStorage key for this private chat
  const mediaKey = selectedContact
    ? `our-heaven-media-msgs-${[user.firstName, selectedContact].sort().join("-")}`
    : null;

  // Load media messages from IndexedDB when contact selected
  useEffect(() => {
    if (!mediaKey) return;
    const metaKey = `${mediaKey}-meta`;
    try {
      const stored = localStorage.getItem(metaKey);
      if (stored) {
        const msgs = JSON.parse(stored) as Array<{
          id: string;
          sender: string;
          content: string;
          time: string;
        }>;
        Promise.all(
          msgs.map(async (m) => {
            const fromDB = await loadMedia(`${mediaKey}-${m.id}`);
            return { ...m, content: fromDB ?? m.content };
          }),
        )
          .then((resolved) => setLocalMediaMsgs(resolved))
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [mediaKey]);

  // Persist media message metadata to localStorage
  useEffect(() => {
    if (!mediaKey) return;
    try {
      const metaKey = `${mediaKey}-meta`;
      const limited = localMediaMsgs.slice(-50);
      const meta = limited.map((m) => ({
        ...m,
        content:
          m.content.startsWith("data:") || m.content.startsWith("blob:")
            ? "[media]"
            : m.content,
      }));
      localStorage.setItem(metaKey, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }, [localMediaMsgs, mediaKey]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollUp(el.scrollTop > 100);
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!actor) return;
    try {
      const allMsgs = await actor.getAllMessages();
      // Extract unique senders for contact picker
      const senders = Array.from(
        new Set(
          allMsgs.map((m) => m.sender).filter((s) => s !== user.firstName),
        ),
      );
      setAllSenders(senders);
      if (selectedContact) {
        // Filter to private chat: messages between currentUser and selectedContact
        const filtered = allMsgs.filter((m) => {
          const isFromMe =
            m.sender === user.firstName &&
            m.content.startsWith(`[to:${selectedContact}]`);
          const isFromThem =
            m.sender === selectedContact &&
            m.content.startsWith(`[to:${user.firstName}]`);
          return isFromMe || isFromThem;
        });
        setMessages(filtered);
      } else {
        setMessages([]);
      }
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [actor, selectedContact, user.firstName]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleSend = async () => {
    if (!input.trim() || !actor || !selectedContact) return;
    setSending(true);
    try {
      await actor.sendMessage(
        user.firstName,
        `[to:${selectedContact}]${input.trim()}`,
      );
      setInput("");
      await loadMessages();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleMediaSend = (media: ChatMediaMessage) => {
    if (!selectedContact) return;
    const rawContent = media.type === "voice" ? media.content : media.content;
    const msgId = `media-${Date.now()}`;
    const newMsg = {
      id: msgId,
      sender: user.firstName,
      content: rawContent,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setLocalMediaMsgs((prev) => [...prev, newMsg]);
    // Persist media to IndexedDB
    if (
      mediaKey &&
      (rawContent.startsWith("data:") || rawContent.startsWith("blob:"))
    ) {
      saveMedia(`${mediaKey}-${msgId}`, rawContent).catch(() => {});
    }
    if (actor) {
      const label =
        media.type === "voice"
          ? `🎤 Voice message from ${user.firstName}`
          : media.type === "video"
            ? `🎥 Video from ${user.firstName}`
            : `📷 Photo from ${user.firstName}`;
      actor
        .sendMessage(user.firstName, `[to:${selectedContact}]${label}`)
        .catch(() => {});
    }
    toast.success(
      media.type === "image"
        ? "Photo sent!"
        : media.type === "video"
          ? "Video sent!"
          : "Voice message sent!",
    );
    setTimeout(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const formatTime = (ts: bigint) => {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Contact picker view
  if (!selectedContact) {
    return (
      <div className="relative min-h-screen celestial-bg flex flex-col overflow-hidden">
        <StarsBackground />
        <div className="relative z-10 flex flex-col h-screen max-w-lg mx-auto w-full px-4 pt-4">
          <SubPageHeader title="Chat with Friends" onBack={onBack} />
          <div className="flex-1 overflow-y-auto py-4">
            <p className="text-muted-foreground text-sm mb-4 text-center">
              Select a person to start a private conversation
            </p>
            {loading && allSenders.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : allSenders.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="messages.empty_state"
              >
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No conversations yet. Ask a friend to send you a message
                  first!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allSenders.map((contact, i) => (
                  <motion.button
                    key={contact}
                    data-ocid={`messages.item.${i + 1}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      setSelectedContact(contact);
                      setLoading(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl card-celestial hover:bg-gold/10 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold font-semibold text-lg">
                        {contact.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-foreground font-medium">
                      {contact}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen celestial-bg flex flex-col overflow-hidden">
      <StarsBackground />
      <div className="relative z-10 flex flex-col h-screen max-w-lg mx-auto w-full px-4 pt-4">
        <SubPageHeader
          title={selectedContact}
          onBack={() => {
            setSelectedContact(null);
            setMessages([]);
            setLocalMediaMsgs([]);
          }}
        />

        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} className="h-full overflow-y-auto mb-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : messages.length === 0 && localMediaMsgs.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="messages.empty_state"
              >
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No messages yet. Say hello!
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-2 pr-2">
                {messages.map((msg, i) => {
                  const canDelete =
                    isLeader(user.firstName, user.lastName) ||
                    msg.sender === user.firstName;
                  // Strip the [to:name] prefix for display
                  const displayContent = msg.content.replace(
                    /^\[to:[^\]]+\]/,
                    "",
                  );
                  return (
                    <motion.div
                      key={`${msg.sender}-${String(msg.timestamp)}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <ChatBubble
                        msg={{ content: displayContent, sender: msg.sender }}
                        isOwn={msg.sender === user.firstName}
                        senderName={msg.sender}
                        time={formatTime(msg.timestamp)}
                        onDelete={
                          canDelete
                            ? async () => {
                                setMessages((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                );
                              }
                            : undefined
                        }
                      />
                    </motion.div>
                  );
                })}
                {localMediaMsgs.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ChatBubble
                      msg={{ content: m.content, sender: m.sender }}
                      isOwn={m.sender === user.firstName}
                      senderName={m.sender}
                      time={m.time}
                      onDelete={
                        isLeader(user.firstName, user.lastName) ||
                        m.sender === user.firstName
                          ? () => {
                              setLocalMediaMsgs((prev) =>
                                prev.filter((x) => x.id !== m.id),
                              );
                            }
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Scroll Up Button */}
          <AnimatePresence>
            {showScrollUp && (
              <motion.button
                key="scroll-up-msgs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
                aria-label="Scroll to top"
                className="absolute bottom-24 right-4 w-9 h-9 rounded-full bg-gold text-deep-space flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-20"
              >
                <ArrowUp className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Scroll Down Button */}
          <AnimatePresence>
            {showScrollDown && (
              <motion.button
                key="scroll-down-msgs"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (scrollRef.current)
                    scrollRef.current.scrollTop =
                      scrollRef.current.scrollHeight;
                }}
                aria-label="Scroll to bottom"
                className="absolute bottom-14 right-4 w-9 h-9 rounded-full bg-gold text-deep-space flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-20"
              >
                <ArrowDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <ChatInputBar
          input={input}
          setInput={setInput}
          onSend={handleSend}
          sending={sending}
          onMediaSend={handleMediaSend}
          ocidPrefix="messages"
        />
      </div>
    </div>
  );
}

// ─── Screen 8: Star of the Month ──────────────────────────────────────────────

function StarsScreen({ onBack }: { onBack: () => void }) {
  const actor = useBackendActor();
  const [stars, setStars] = useState<StarOfTheMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    month: "",
    name: "",
    position: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      setStars(await actor.getAllStars());
    } catch {
      toast.error("Failed to load stars");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editForm.month || !editForm.name || !editForm.position) {
      toast.error("All fields required");
      return;
    }
    if (!actor) return;
    setSaving(true);
    try {
      await actor.addOrUpdateStar(
        editForm.month,
        editForm.name,
        editForm.position,
      );
      await load();
      setEditOpen(false);
      toast.success("Star updated!");
    } catch {
      toast.error("Failed to save. Admin access required.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (month: string) => {
    if (!actor) return;
    try {
      await actor.deleteStar(month);
      await load();
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete. Admin access required.");
    }
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Star of the Month" onBack={onBack} />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : stars.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No stars yet</p>
          </div>
        ) : (
          <div className="card-celestial rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                    Month
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                    Position
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {stars.map((s) => (
                  <tr
                    key={s.month}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-gold font-medium">
                      {s.month}
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.position}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(s.month)}
                        className="w-7 h-7 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          onClick={() => {
            setEditForm({ month: "", name: "", position: "" });
            setEditOpen(true);
          }}
          className="bg-gold text-deep-space hover:bg-accent rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" /> Add / Update Star
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add / Update Star
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(["month", "name", "position"] as const).map((key) => (
              <div key={key}>
                <Label className="text-muted-foreground text-sm capitalize">
                  {key}
                </Label>
                <Input
                  value={editForm[key]}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  placeholder={
                    key === "month"
                      ? "e.g. January"
                      : key === "position"
                        ? "e.g. 1st"
                        : "Full name"
                  }
                  className="bg-input border-border mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Screen 9: Birthday Dates ──────────────────────────────────────────────────

function BirthdaysScreen({ onBack }: { onBack: () => void }) {
  const actor = useBackendActor();
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", date: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      setBirthdays(await actor.getAllBirthdays());
    } catch {
      toast.error("Failed to load birthdays");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editForm.name || !editForm.date) {
      toast.error("All fields required");
      return;
    }
    if (!actor) return;
    setSaving(true);
    try {
      await actor.addOrUpdateBirthday(editForm.name, editForm.date);
      await load();
      setEditOpen(false);
      toast.success("Birthday saved!");
    } catch {
      toast.error("Failed to save. Admin access required.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!actor) return;
    try {
      await actor.deleteBirthday(name);
      await load();
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete. Admin access required.");
    }
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditForm({ name: "", date: "" });
                setEditOpen(true);
              }}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
              title="Add birthday"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <h1 className="font-display text-xl font-bold text-gold">
              Birthday Dates
            </h1>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : birthdays.length === 0 ? (
          <div className="text-center py-16">
            <Cake className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No birthdays added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {birthdays.map((b, i) => (
              <motion.div
                key={b.name}
                className="card-celestial rounded-2xl px-4 py-3 flex items-center justify-between"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div>
                  <p className="font-display font-semibold text-foreground">
                    {b.name}
                  </p>
                  <p className="text-gold text-sm">{b.date}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(b.name)}
                  className="w-8 h-8 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add / Update Birthday
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Full name"
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Date</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, date: e.target.value }))
                }
                className="bg-input border-border mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Screen 10: Meet ───────────────────────────────────────────────────────────

function MeetScreen({ onBack }: { onBack: () => void }) {
  const actor = useBackendActor();
  const [links, setLinks] = useState<MeetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", url: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      setLinks(await actor.getAllMeetLinks());
    } catch {
      toast.error("Failed to load meet links");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editForm.title || !editForm.url) {
      toast.error("All fields required");
      return;
    }
    if (!actor) return;
    setSaving(true);
    try {
      await actor.addOrUpdateMeetLink(editForm.title, editForm.url);
      await load();
      setEditOpen(false);
      toast.success("Meet link saved!");
    } catch {
      toast.error("Failed to save. Admin access required.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (title: string) => {
    if (!actor) return;
    try {
      await actor.deleteMeetLink(title);
      await load();
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete. Admin access required.");
    }
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <h1 className="font-display text-xl font-bold text-gold">Meet</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditForm({ title: "", url: "" });
                setEditOpen(true);
              }}
              className="border border-gold/30 text-gold hover:bg-gold/10 rounded-xl text-xs h-9"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No meeting links yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((l, i) => (
              <motion.div
                key={l.title}
                className="card-celestial rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">
                    {l.title}
                  </p>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold text-sm hover:underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{l.url}</span>
                  </a>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(l.title)}
                  className="w-8 h-8 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add / Update Meeting Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Team Standup"
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">URL</Label>
              <Input
                value={editForm.url}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://meet.google.com/..."
                className="bg-input border-border mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Screen 11: Important Messages ────────────────────────────────────────────

function ImportantMessagesScreen({
  user,
  onBack,
}: {
  user: UserData;
  onBack: () => void;
}) {
  const actor = useBackendActor();
  const [msgs, setMsgs] = useState<ImportantMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editMsg, setEditMsg] = useState<ImportantMessage | null>(null);
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  const isAllowed = isLeader(user.firstName, user.lastName);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const all = await actor.getAllImportantMessages();
      setMsgs(all.filter((m) => !m.dismissed));
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = async (id: bigint) => {
    if (!actor) return;
    try {
      await actor.dismissImportantMessage(id);
      setMsgs((p) => p.filter((m) => m.id !== id));
      toast.success("Message dismissed");
    } catch {
      toast.error("Failed to dismiss");
    }
  };

  const handleAdd = async () => {
    if (!formContent.trim() || !actor) return;
    setSaving(true);
    try {
      await actor.addImportantMessage(formContent.trim(), user.firstName);
      await load();
      setAddOpen(false);
      setFormContent("");
      toast.success("Message added!");
    } catch {
      toast.error("Failed to add message. Only Aaron or Nevveen can post.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editMsg || !formContent.trim() || !actor) return;
    setSaving(true);
    try {
      await actor.updateImportantMessage(
        editMsg.id,
        formContent.trim(),
        user.firstName,
      );
      await load();
      setEditMsg(null);
      setFormContent("");
      toast.success("Message updated!");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (msg: ImportantMessage) => {
    setEditMsg(msg);
    setFormContent(msg.content);
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Important Messages" onBack={onBack} />

        {isAllowed && (
          <div className="mb-4">
            <Button
              onClick={() => {
                setAddOpen(true);
                setFormContent("");
              }}
              className="bg-gold text-deep-space hover:bg-accent rounded-xl text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Message
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No important messages</p>
          </div>
        ) : (
          <div className="space-y-3">
            {msgs.map((msg, i) => (
              <motion.div
                key={String(msg.id)}
                className="card-celestial rounded-2xl px-4 py-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-gold text-xs font-medium">
                    From: {msg.author}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAllowed && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(msg)}
                        className="w-7 h-7 text-muted-foreground hover:text-gold hover:bg-gold/10 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDismiss(msg.id)}
                      className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-foreground text-sm leading-relaxed">
                  {msg.content}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Message Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add Important Message
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground text-sm">Message</Label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Enter important message..."
              rows={4}
              className="w-full mt-1 bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog
        open={!!editMsg}
        onOpenChange={(o) => {
          if (!o) {
            setEditMsg(null);
            setFormContent("");
          }
        }}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Edit Message
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground text-sm">Message</Label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              className="w-full mt-1 bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setEditMsg(null);
                setFormContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Your Ideas Screen ─────────────────────────────────────────────────────────
function YourIdeasScreen({
  user,
  onBack,
}: { user: UserData; onBack: () => void }) {
  const [ideas, setIdeas] = useState<
    Array<{ id: number; text: string; author: string }>
  >([]);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (!input.trim()) return;
    setIdeas((p) => [
      ...p,
      { id: Date.now(), text: input.trim(), author: user.firstName || "You" },
    ]);
    setInput("");
    setShowInput(false);
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Your Ideas" onBack={onBack} />
        <div className="space-y-3 mb-4">
          {ideas.length === 0 && (
            <div className="text-center py-16">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No ideas yet. Share one!</p>
            </div>
          )}
          {ideas.map((idea) => {
            const canDelete =
              isLeader(user.firstName, user.lastName) ||
              idea.author === user.firstName;
            return (
              <div
                key={idea.id}
                className="card-celestial rounded-2xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gold text-xs font-medium mb-1">
                      {idea.author}
                    </p>
                    <p className="text-foreground text-sm">{idea.text}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        setIdeas((prev) => prev.filter((x) => x.id !== idea.id))
                      }
                      aria-label="Delete idea"
                      className="text-destructive hover:text-destructive/80 transition-colors p-1 rounded flex-shrink-0 mt-0.5"
                      data-ocid="ideas.delete_button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {showInput ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your idea..."
              className="flex-1 bg-input border-border text-foreground rounded-xl h-12"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button
              onClick={handleAdd}
              className="bg-gold text-deep-space hover:bg-accent rounded-xl h-12 w-12 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowInput(true)}
            className="w-full h-12 bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 rounded-xl text-2xl font-bold"
          >
            +
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Photos Screen ─────────────────────────────────────────────────────────────
function PhotosScreen({ onBack }: { onBack: () => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotos((p) => [...p, ...urls]);
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Photos" onBack={onBack} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFile}
        />
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-gold/20 border-2 border-gold/50 flex items-center justify-center text-gold text-5xl hover:bg-gold/30 transition-all"
            >
              +
            </button>
            <p className="text-muted-foreground mt-4">Tap + to add photos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {photos.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  className="w-full aspect-square object-cover rounded-xl"
                  alt={`photo-${i}`}
                />
              ))}
            </div>
            <Button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-gold text-deep-space hover:bg-accent rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add More
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WhatsApp Screen ───────────────────────────────────────────────────────────
function WhatsAppScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="WhatsApp Group" onBack={onBack} />
        <div className="flex flex-col items-center gap-6 py-8">
          <a
            href="https://chat.whatsapp.com/EsAQ1eklgIrHfv6kHxkKis"
            target="_blank"
            rel="noreferrer"
            className="w-full"
          >
            <Button className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Join WhatsApp Group
            </Button>
          </a>
          <img
            src="/assets/uploads/Screenshot_2026-03-01-09-33-49-19_40deb401b9ffe8e1df2f1cc5ba480b12-1.jpg"
            alt="WhatsApp QR Code"
            className="w-64 h-64 object-contain rounded-2xl border border-border"
          />
          <p className="text-muted-foreground text-sm text-center">
            Scan the QR code or tap the button above to join
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── YouTube Screen ────────────────────────────────────────────────────────────
function YouTubeScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="YouTube Channel" onBack={onBack} />
        <div className="flex flex-col items-center gap-6 py-8">
          <Youtube className="w-20 h-20 text-red-500" />
          <h2 className="font-display text-2xl font-bold text-gold text-center">
            Our Heaven by Kids
          </h2>
          <a
            href="https://www.youtube.com/@ourHeavenBykids"
            target="_blank"
            rel="noreferrer"
            className="w-full"
          >
            <Button className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2">
              <Youtube className="w-5 h-5" /> Open YouTube Channel
            </Button>
          </a>
          <p className="text-muted-foreground text-sm text-center">
            Tap the button above to visit our YouTube channel
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Screen ───────────────────────────────────────────────────────────
function CalendarScreen({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<
    Array<{ id: number; title: string; date: string }>
  >([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "" });

  const handleAdd = () => {
    if (!form.title || !form.date) return;
    setEvents((p) => [
      ...p,
      { id: Date.now(), title: form.title, date: form.date },
    ]);
    setForm({ title: "", date: "" });
    setAddOpen(false);
    toast.success("Date added!");
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <h1 className="font-display text-xl font-bold text-gold">
            Dates & Calendar
          </h1>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setAddOpen(true)}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="card-celestial rounded-2xl p-4 mb-4 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="text-foreground"
          />
        </div>
        {events.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-gold font-display font-semibold mb-2">
              Important Dates
            </h3>
            {events.map((ev) => (
              <div
                key={ev.id}
                className="card-celestial rounded-xl px-4 py-3 flex justify-between"
              >
                <p className="text-foreground font-medium">{ev.title}</p>
                <p className="text-gold text-sm">{ev.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add Important Date
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Final Exam"
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                className="bg-input border-border mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── School Works Screen ───────────────────────────────────────────────────────
function SchoolWorksScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="School Works" onBack={onBack} />
        <div className="flex flex-col items-center gap-6 py-8">
          <GraduationCap className="w-20 h-20 text-gold" />
          <h2 className="font-display text-xl font-bold text-gold text-center">
            Textbooks & Study Materials
          </h2>
          <a
            href="https://textbooksall.blogspot.com/2024/05/std-1-3-5-7-9-2024-24-textbooks-for.html?m=1"
            target="_blank"
            rel="noreferrer"
            className="w-full"
          >
            <Button className="w-full h-14 bg-gold text-deep-space hover:bg-accent rounded-xl text-base font-semibold flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" /> Open Textbooks Website
            </Button>
          </a>
          <p className="text-muted-foreground text-sm text-center">
            Tap the button above to access STD 1, 3, 5, 7, 9 textbooks
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Rules Screen ──────────────────────────────────────────────────────────────
function RulesScreen({ user, onBack }: { user: UserData; onBack: () => void }) {
  const leaderAccess = isLeader(user.firstName, user.lastName);
  const isAaron = user.firstName.trim().toLowerCase() === "aaron";
  const [rulesPhoto, setRulesPhoto] = useState<string | null>(null);
  const rulesPhotoInputRef = useRef<HTMLInputElement>(null);
  const [rules, setRules] = useState([
    "NO BAD WORDS",
    "NO SPAMMING",
    "BE FRIENDLY TO OTHERS",
    "NO UNWANTED MESSAGES",
    "DO NOT PLAY STATUE GAME",
    "THIS GROUP CAN TALK ONLY GAMES",
    "DO NOT HURT ANYONE",
    "QUIZ ONLY ABOUT GAMES THINGS",
    "DO NOT MAKE FUN OF OTHERS IF THEY ARE IN ANY PROBLEM",
    "IF SOMEONE NEED NOTES OR INFO SEND THEM THE ANSWER",
  ]);
  const [editing, setEditing] = useState(false);
  const [editTexts, setEditTexts] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  const startEdit = () => {
    setEditTexts([...rules]);
    setEditing(true);
  };
  const saveEdit = () => {
    const cleaned = editTexts.map((r) => r.trim()).filter((r) => r.length > 0);
    setRules(cleaned);
    setEditing(false);
    setNewRule("");
  };
  const cancelEdit = () => {
    setEditing(false);
    setNewRule("");
  };
  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setEditTexts((prev) => [...prev, trimmed.toUpperCase()]);
    setNewRule("");
  };
  const removeRule = (idx: number) => {
    setEditTexts((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Rules" onBack={onBack} />
        <div className="card-celestial rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-gold text-center flex-1">
              RULES OF THIS GROUP
            </h2>
            {leaderAccess && !editing && (
              <button
                type="button"
                data-ocid="rules.edit_button"
                onClick={startEdit}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold text-xs font-semibold border border-gold/40 transition-colors flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-3">
              {rules.map((rule, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: order-dependent list
                <div key={`rule-view-${i}`} className="flex items-start gap-3">
                  <span className="text-gold font-bold text-sm flex-shrink-0">
                    {i + 1})
                  </span>
                  <p className="text-foreground text-sm">{rule}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {editTexts.map((rule, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: order-dependent editable list
                <div key={`rule-edit-${i}`} className="flex items-center gap-2">
                  <span className="text-gold font-bold text-sm flex-shrink-0 w-6">
                    {i + 1})
                  </span>
                  <input
                    data-ocid={`rules.input.${i + 1}`}
                    value={rule}
                    onChange={(e) => {
                      const updated = [...editTexts];
                      updated[i] = e.target.value;
                      setEditTexts(updated);
                    }}
                    className="flex-1 bg-background/60 border border-gold/30 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold/70"
                  />
                  <button
                    type="button"
                    data-ocid={`rules.delete_button.${i + 1}`}
                    onClick={() => removeRule(i)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {/* Add new rule */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <input
                  data-ocid="rules.new_rule.input"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Add new rule..."
                  onKeyDown={(e) => e.key === "Enter" && addRule()}
                  className="flex-1 bg-background/60 border border-gold/30 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/70"
                />
                <button
                  type="button"
                  data-ocid="rules.add_button"
                  onClick={addRule}
                  className="px-3 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold text-sm font-semibold border border-gold/40 transition-colors flex-shrink-0"
                >
                  Add
                </button>
              </div>
              {/* Save / Cancel */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  data-ocid="rules.save_button"
                  onClick={saveEdit}
                  className="flex-1 py-2 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/80 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  data-ocid="rules.cancel_button"
                  onClick={cancelEdit}
                  className="flex-1 py-2 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules Photo Section */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gold font-semibold text-sm">Rules Photo</h3>
              {isAaron && (
                <button
                  type="button"
                  data-ocid="rules.upload_button"
                  onClick={() => rulesPhotoInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold text-xs font-semibold border border-gold/40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {rulesPhoto ? "Change" : "Add Photo"}
                </button>
              )}
              <input
                ref={rulesPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-ocid="rules.dropzone"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setRulesPhoto(ev.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </div>
            {rulesPhoto ? (
              <div className="relative rounded-xl overflow-hidden border border-gold/30">
                <img
                  src={rulesPhoto}
                  alt="Rules"
                  className="w-full object-contain max-h-72"
                />
                {isAaron && (
                  <button
                    type="button"
                    data-ocid="rules.delete_button"
                    onClick={() => setRulesPhoto(null)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic text-center">
                No photo added yet.
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-muted-foreground text-xs italic text-center">
              Note: Breaking these rules can result in ban. 1 MONTH LEFT THE 2
              GROUPS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Screen ─────────────────────────────────────────────────────────
function AttendanceScreen({
  user,
  onBack,
}: { user: UserData; onBack: () => void }) {
  const isAdmin = isLeader(user.firstName, user.lastName);
  const [members, setMembers] = useState<
    Array<{
      id: number;
      name: string;
      status: "Present" | "Leave";
      level: string;
    }>
  >([
    { id: 1, name: "Aaron", status: "Present", level: "Admin" },
    { id: 2, name: "Nevveen", status: "Present", level: "Admin" },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const toggleStatus = (id: number) => {
    if (!isAdmin) return;
    setMembers((p) =>
      p.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "Present" ? "Leave" : "Present" }
          : m,
      ),
    );
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    setMembers((p) => [
      ...p,
      {
        id: Date.now(),
        name: newName.trim(),
        status: "Present",
        level: "Member",
      },
    ]);
    setNewName("");
    setAddOpen(false);
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Attendance & Level" onBack={onBack} />
        {isAdmin && (
          <div className="mb-4">
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-gold text-deep-space hover:bg-accent rounded-xl text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        )}
        <div className="card-celestial rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground">
                  Level
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {m.name}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(m.id)}
                      disabled={!isAdmin}
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${m.status === "Present" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} ${isAdmin ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                    >
                      {m.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add Member
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground text-sm">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Member name"
              className="bg-input border-border mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Prayer Screen ─────────────────────────────────────────────────────────────
interface PrayerEntry {
  id: string;
  text: string;
  author: string;
}

function PrayerScreen({ onBack }: { onBack: () => void }) {
  const [prayers, setPrayers] = useState<PrayerEntry[]>([
    {
      id: "1",
      text: "Lord, bless our group with love, peace, and wisdom. Amen.",
      author: "Everyone",
    },
    {
      id: "2",
      text: "May God guide our steps and keep us together always. Amen.",
      author: "Everyone",
    },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const addPrayer = () => {
    if (!newPrayer.trim()) return;
    setPrayers((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newPrayer.trim(), author: "Me" },
    ]);
    setNewPrayer("");
    setShowAdd(false);
    toast.success("Prayer added!");
  };

  const saveEdit = (id: string) => {
    setPrayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, text: editText } : p)),
    );
    setEditId(null);
    toast.success("Prayer updated!");
  };

  const deletePrayer = (id: string) => {
    setPrayers((prev) => prev.filter((p) => p.id !== id));
    toast.success("Prayer removed");
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-display text-xl font-bold text-gold">Prayer</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAdd(true)}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            data-ocid="prayer.open_modal_button"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {showAdd && (
          <div className="card-celestial rounded-2xl p-4 mb-4">
            <h3 className="text-gold font-semibold mb-3">Add New Prayer</h3>
            <textarea
              value={newPrayer}
              onChange={(e) => setNewPrayer(e.target.value)}
              placeholder="Write your prayer here..."
              rows={4}
              className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold resize-none mb-3"
              data-ocid="prayer.textarea"
            />
            <div className="flex gap-2">
              <Button
                onClick={addPrayer}
                className="flex-1 bg-gold text-deep-space hover:bg-accent rounded-xl"
                data-ocid="prayer.submit_button"
              >
                Save Prayer
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAdd(false);
                  setNewPrayer("");
                }}
                className="flex-1 border border-border rounded-xl"
                data-ocid="prayer.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {prayers.map((p, i) => (
            <div
              key={p.id}
              className="card-celestial rounded-2xl p-5"
              data-ocid={`prayer.item.${i + 1}`}
            >
              <Heart className="w-6 h-6 text-gold mx-auto mb-3" />
              {editId === p.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gold resize-none mb-3"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(p.id)}
                      className="flex-1 bg-gold text-deep-space hover:bg-accent rounded-xl"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                      className="flex-1 border border-border rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-foreground text-sm leading-relaxed text-center italic mb-4">
                    {p.text}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditId(p.id);
                        setEditText(p.text);
                      }}
                      className="border border-gold/30 text-gold hover:bg-gold/10 rounded-xl text-xs"
                      data-ocid={`prayer.edit_button.${i + 1}`}
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePrayer(p.id)}
                      className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-xs"
                      data-ocid={`prayer.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Indian Songs & Prayers Screen ────────────────────────────────────────────
interface SongEntry {
  id: string;
  title: string;
  type: "song" | "prayer";
  content: string;
  youtubeUrl?: string;
}

function IndianSongsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<SongEntry[]>([
    {
      id: "1",
      title: "Om Namah Shivaya",
      type: "prayer",
      content: "A sacred mantra dedicated to Lord Shiva. Chant with devotion.",
      youtubeUrl: "",
    },
    {
      id: "2",
      title: "Hare Krishna Mahamantra",
      type: "prayer",
      content:
        "Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare.",
      youtubeUrl: "",
    },
    {
      id: "3",
      title: "Bhajan - Raghupati Raghav",
      type: "song",
      content: "Raghupati Raghav Raja Ram, Patita Pavan Sita Ram...",
      youtubeUrl:
        "https://www.youtube.com/results?search_query=raghupati+raghav+bhajan",
    },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"song" | "prayer">("prayer");
  const [newUrl, setNewUrl] = useState("");

  const addItem = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTitle.trim(),
        type: newType,
        content: newContent.trim(),
        youtubeUrl: newUrl.trim(),
      },
    ]);
    setNewTitle("");
    setNewContent("");
    setNewUrl("");
    setNewType("prayer");
    setShowAdd(false);
    toast.success("Added successfully!");
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-gold">
            Indian Songs & Prayers
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAdd(true)}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            data-ocid="indian.open_modal_button"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {showAdd && (
          <div className="card-celestial rounded-2xl p-4 mb-4">
            <h3 className="text-gold font-semibold mb-3">Add Song / Prayer</h3>
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                onClick={() => setNewType("prayer")}
                className={`flex-1 rounded-xl text-xs ${newType === "prayer" ? "bg-gold text-deep-space" : "border border-border text-foreground bg-transparent"}`}
              >
                Prayer
              </Button>
              <Button
                size="sm"
                onClick={() => setNewType("song")}
                className={`flex-1 rounded-xl text-xs ${newType === "song" ? "bg-gold text-deep-space" : "border border-border text-foreground bg-transparent"}`}
              >
                Song
              </Button>
            </div>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title..."
              className="mb-2 rounded-xl"
              data-ocid="indian.input"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Lyrics / Prayer text..."
              rows={4}
              className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold resize-none mb-2"
              data-ocid="indian.textarea"
            />
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="YouTube link (optional)"
              className="mb-3 rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                onClick={addItem}
                className="flex-1 bg-gold text-deep-space hover:bg-accent rounded-xl"
                data-ocid="indian.submit_button"
              >
                Add
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAdd(false)}
                className="flex-1 border border-border rounded-xl"
                data-ocid="indian.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="card-celestial rounded-2xl p-5"
              data-ocid={`indian.item.${i + 1}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${item.type === "song" ? "bg-purple-500/20 text-purple-300" : "bg-gold/20 text-gold"}`}
                  >
                    {item.type === "song" ? "Song" : "Prayer"}
                  </span>
                  <span className="text-foreground font-semibold text-sm">
                    {item.title}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteItem(item.id)}
                  className="text-red-400 hover:bg-red-500/10 w-7 h-7 rounded-lg"
                  data-ocid={`indian.delete_button.${i + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed italic mb-3">
                {item.content}
              </p>
              {item.youtubeUrl && (
                <a
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gold text-xs hover:underline"
                >
                  <Youtube className="w-3.5 h-3.5" /> Watch on YouTube
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Calling Screen ────────────────────────────────────────────────────────────
interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

// ─── All Persons Screen ───────────────────────────────────────────────────────

function AllPersonsScreen({ onBack }: { onBack: () => void }) {
  const actor = useBackendActor();
  const [accounts, setAccounts] = useState<
    Array<{ firstName: string; lastName: string; phone: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!actor) return;
    actor
      .getAllAccounts()
      .then((list) => {
        setAccounts(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const filtered = accounts.filter((a) => {
    const full = `${a.firstName} ${a.lastName}`.toLowerCase();
    return full.includes(search.toLowerCase()) || a.phone.includes(search);
  });

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="All Persons" onBack={onBack} />
        <div className="mb-4">
          <input
            data-ocid="all_persons.search_input"
            className="w-full px-4 py-2 rounded-xl border border-gold/40 bg-black/40 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/60 text-sm"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div
            data-ocid="all_persons.loading_state"
            className="flex items-center justify-center py-16"
          >
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="all_persons.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40 text-gold" />
            <p className="font-semibold">No members found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a, i) => (
              <div
                key={`person-${a.phone}-${i}`}
                data-ocid={`all_persons.item.${i + 1}`}
                className="flex items-center justify-between bg-black/40 border border-gold/20 rounded-xl px-4 py-3 hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">
                    {a.firstName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="font-semibold text-foreground text-sm">
                    {a.firstName} {a.lastName}
                  </span>
                </div>
                <a
                  href={`tel:${a.phone}`}
                  className="flex items-center gap-1 text-gold text-sm font-mono hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {a.phone}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Messaging Hub Screen ─────────────────────────────────────────────────────

type MessagingTab = "chats" | "updates" | "groups" | "calls";

function MessagingHubScreen({
  user,
  onBack,
  unreadMessages,
  notificationCount,
  notifications,
  onMarkAllRead,
  onDismissOne,
}: {
  user: UserData;
  onBack: () => void;
  unreadMessages: number;
  notificationCount: number;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onDismissOne: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<MessagingTab>("chats");

  const tabs: {
    id: MessagingTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: number;
  }[] = [
    { id: "chats", label: "Chats", icon: MessageSquare, badge: unreadMessages },
    { id: "updates", label: "Updates", icon: Bell, badge: notificationCount },
    { id: "groups", label: "Groups", icon: Users, badge: 0 },
    { id: "calls", label: "Calls", icon: Phone, badge: 0 },
  ];

  return (
    <div className="relative min-h-screen celestial-bg flex flex-col">
      <StarsBackground />
      <div className="relative z-10 flex-1 overflow-y-auto pb-20">
        {activeTab === "chats" && (
          <MessagesScreen user={user} onBack={onBack} />
        )}
        {activeTab === "updates" && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onDismissOne={onDismissOne}
            onBack={onBack}
          />
        )}
        {activeTab === "groups" && (
          <GroupChatScreen user={user} onBack={onBack} />
        )}
        {activeTab === "calls" && <CallingScreen onBack={onBack} />}
      </div>
      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/90 border-t border-gold/30 backdrop-blur-md">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-ocid={`messaging_hub.${tab.id}.tab`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[60px] ${
                  isActive ? "bg-gold/20" : "hover:bg-gold/10"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-gold" : "text-muted-foreground"}`}
                  />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold ${isActive ? "text-gold" : "text-muted-foreground"}`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CallingScreen({ onBack }: { onBack: () => void }) {
  const [contacts, setContacts] = useState<ContactEntry[]>([
    { id: "1", name: "Aaron David Jojo", phone: "" },
    { id: "2", name: "Nevveen", phone: "" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const addContact = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setContacts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        phone: newPhone.trim(),
      },
    ]);
    setNewName("");
    setNewPhone("");
    setShowAdd(false);
    toast.success("Contact added!");
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success("Contact removed");
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-display text-xl font-bold text-gold">Calling</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAdd(true)}
            className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            data-ocid="calling.open_modal_button"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {showAdd && (
          <div className="card-celestial rounded-2xl p-4 mb-4">
            <h3 className="text-gold font-semibold mb-3">Add Contact</h3>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name..."
              className="mb-2 rounded-xl"
              data-ocid="calling.input"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone number..."
              type="tel"
              className="mb-3 rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                onClick={addContact}
                className="flex-1 bg-gold text-deep-space hover:bg-accent rounded-xl"
                data-ocid="calling.submit_button"
              >
                Add
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAdd(false)}
                className="flex-1 border border-border rounded-xl"
                data-ocid="calling.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div
              key={c.id}
              className="card-celestial rounded-2xl p-4 flex items-center justify-between"
              data-ocid={`calling.item.${i + 1}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-foreground font-medium text-sm">
                    {c.name}
                  </p>
                  {c.phone && (
                    <p className="text-muted-foreground text-xs">{c.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.phone && (
                  <a href={`tel:${c.phone}`}>
                    <Button
                      size="icon"
                      className="bg-green-600 hover:bg-green-700 w-9 h-9 rounded-xl"
                      data-ocid={`calling.button.${i + 1}`}
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </Button>
                  </a>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteContact(c.id)}
                  className="text-red-400 hover:bg-red-500/10 w-8 h-8 rounded-lg"
                  data-ocid={`calling.delete_button.${i + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div
              className="text-center text-muted-foreground py-10"
              data-ocid="calling.empty_state"
            >
              <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contacts yet. Tap + to add.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Group Chat Screen ─────────────────────────────────────────────────────────
function GroupChatScreen({
  user,
  onBack,
}: { user: UserData; onBack: () => void }) {
  const actor = useBackendActor();
  const [messages, setMessages] = useState<Message[]>([]);
  const [localMediaMsgs, setLocalMediaMsgs] = useState<
    Array<{ id: string; sender: string; content: string; time: string }>
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load group media from IndexedDB on mount
  useEffect(() => {
    const metaKey = "our-heaven-media-msgs-group-meta";
    try {
      const stored = localStorage.getItem(metaKey);
      if (stored) {
        const msgs = JSON.parse(stored) as Array<{
          id: string;
          sender: string;
          content: string;
          time: string;
        }>;
        Promise.all(
          msgs.map(async (m) => {
            const fromDB = await loadMedia(`group-${m.id}`);
            return { ...m, content: fromDB ?? m.content };
          }),
        )
          .then((resolved) => setLocalMediaMsgs(resolved))
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist group media metadata to localStorage
  useEffect(() => {
    try {
      const metaKey = "our-heaven-media-msgs-group-meta";
      const limited = localMediaMsgs.slice(-50);
      const meta = limited.map((m) => ({
        ...m,
        content:
          m.content.startsWith("data:") || m.content.startsWith("blob:")
            ? "[media]"
            : m.content,
      }));
      localStorage.setItem(metaKey, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }, [localMediaMsgs]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollUp(el.scrollTop > 100);
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!actor) return;
    try {
      const msgs = await actor.getAllMessages();
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current)
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleSend = async () => {
    if (!input.trim() || !actor) return;
    setSending(true);
    try {
      await actor.sendMessage(user.firstName, input.trim());
      setInput("");
      await loadMessages();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleMediaSend = (media: ChatMediaMessage) => {
    const msgId = `media-gc-${Date.now()}`;
    const rawContent = media.content;
    const newMsg = {
      id: msgId,
      sender: user.firstName,
      content: rawContent,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setLocalMediaMsgs((prev) => [...prev, newMsg]);
    // Persist media to IndexedDB
    if (rawContent.startsWith("data:") || rawContent.startsWith("blob:")) {
      saveMedia(`group-${msgId}`, rawContent).catch(() => {});
    }
    if (actor) {
      const label =
        media.type === "voice"
          ? `🎤 Voice message from ${user.firstName}`
          : media.type === "video"
            ? `🎥 Video from ${user.firstName}`
            : `📷 Photo from ${user.firstName}`;
      actor.sendMessage(user.firstName, label).catch(() => {});
    }
    toast.success(
      media.type === "image"
        ? "Photo sent!"
        : media.type === "video"
          ? "Video sent!"
          : "Voice message sent!",
    );
    setTimeout(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const formatTime = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="relative min-h-screen celestial-bg flex flex-col overflow-hidden">
      <StarsBackground />
      <div className="relative z-10 flex flex-col h-screen max-w-lg mx-auto w-full px-4 pt-4">
        <SubPageHeader title="Group Chat" onBack={onBack} />

        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} className="h-full overflow-y-auto mb-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : messages.length === 0 && localMediaMsgs.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No messages yet. Say hello!
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-2 pr-2">
                {messages.map((msg, i) => {
                  const canDelete =
                    isLeader(user.firstName, user.lastName) ||
                    msg.sender === user.firstName;
                  return (
                    <motion.div
                      key={`${msg.sender}-${String(msg.timestamp)}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <ChatBubble
                        msg={{ content: msg.content, sender: msg.sender }}
                        isOwn={msg.sender === user.firstName}
                        senderName={msg.sender}
                        time={formatTime(msg.timestamp)}
                        onDelete={
                          canDelete
                            ? () => {
                                setMessages((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                );
                              }
                            : undefined
                        }
                      />
                    </motion.div>
                  );
                })}
                {localMediaMsgs.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ChatBubble
                      msg={{ content: m.content, sender: m.sender }}
                      isOwn={m.sender === user.firstName}
                      senderName={m.sender}
                      time={m.time}
                      onDelete={
                        isLeader(user.firstName, user.lastName) ||
                        m.sender === user.firstName
                          ? () => {
                              setLocalMediaMsgs((prev) =>
                                prev.filter((x) => x.id !== m.id),
                              );
                            }
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Scroll Up Button */}
          <AnimatePresence>
            {showScrollUp && (
              <motion.button
                key="scroll-up-group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
                aria-label="Scroll to top"
                className="absolute bottom-24 right-4 w-9 h-9 rounded-full bg-gold text-deep-space flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-20"
              >
                <ArrowUp className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Scroll Down Button */}
          <AnimatePresence>
            {showScrollDown && (
              <motion.button
                key="scroll-down-group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (scrollRef.current)
                    scrollRef.current.scrollTop =
                      scrollRef.current.scrollHeight;
                }}
                aria-label="Scroll to bottom"
                className="absolute bottom-14 right-4 w-9 h-9 rounded-full bg-gold text-deep-space flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-20"
              >
                <ArrowDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <ChatInputBar
          input={input}
          setInput={setInput}
          onSend={handleSend}
          sending={sending}
          onMediaSend={handleMediaSend}
          ocidPrefix="group_chat"
        />
      </div>
    </div>
  );
}

// ─── Home Works Screen ─────────────────────────────────────────────────────────
function HomeWorksScreen({
  user,
  onBack,
}: { user: UserData; onBack: () => void }) {
  const isAdmin = isLeader(user.firstName, user.lastName);
  const [works, setWorks] = useState<
    Array<{ id: number; title: string; desc: string; due: string }>
  >([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", due: "" });

  const handleAdd = () => {
    if (!form.title) return;
    setWorks((p) => [...p, { id: Date.now(), ...form }]);
    setForm({ title: "", desc: "", due: "" });
    setAddOpen(false);
    toast.success("Homework added!");
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <SubPageHeader title="Home Works" onBack={onBack} />
        {isAdmin && (
          <div className="mb-4">
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-gold text-deep-space hover:bg-accent rounded-xl text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Homework
            </Button>
          </div>
        )}
        {works.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No homework assignments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {works.map((w) => (
              <div key={w.id} className="card-celestial rounded-2xl px-4 py-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-display font-semibold text-foreground">
                    {w.title}
                  </p>
                  {w.due && <span className="text-gold text-xs">{w.due}</span>}
                </div>
                {w.desc && (
                  <p className="text-muted-foreground text-sm">{w.desc}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add Homework
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Math Chapter 5"
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">
                Description
              </Label>
              <Input
                value={form.desc}
                onChange={(e) =>
                  setForm((p) => ({ ...p, desc: e.target.value }))
                }
                placeholder="Details..."
                className="bg-input border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Due Date</Label>
              <Input
                type="date"
                value={form.due}
                onChange={(e) =>
                  setForm((p) => ({ ...p, due: e.target.value }))
                }
                className="bg-input border-border mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-gold text-deep-space hover:bg-accent"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quiz Screen ───────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  marks: number;
}

// ─── Games Screen ─────────────────────────────────────────────────────────────

type GameId = "sos" | "tictactoe" | "memory" | "puzzle" | null;

function SOSGame({ onBack }: { onBack: () => void }) {
  const SIZE = 5;
  const empty = Array(SIZE * SIZE).fill("");
  const [board, setBoard] = useState<string[]>(empty);
  const [turn, setTurn] = useState<"P1" | "P2">("P1");
  const [letter, setLetter] = useState<"S" | "O">("S");
  const [scores, setScores] = useState({ P1: 0, P2: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  function countSOS(b: string[]) {
    let count = 0;
    const lines: number[][] = [];
    // rows
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c <= SIZE - 3; c++)
        lines.push([r * SIZE + c, r * SIZE + c + 1, r * SIZE + c + 2]);
    // cols
    for (let c = 0; c < SIZE; c++)
      for (let r = 0; r <= SIZE - 3; r++)
        lines.push([r * SIZE + c, (r + 1) * SIZE + c, (r + 2) * SIZE + c]);
    // diag \\
    for (let r = 0; r <= SIZE - 3; r++)
      for (let c = 0; c <= SIZE - 3; c++)
        lines.push([
          r * SIZE + c,
          (r + 1) * SIZE + c + 1,
          (r + 2) * SIZE + c + 2,
        ]);
    // diag /
    for (let r = 0; r <= SIZE - 3; r++)
      for (let c = 2; c < SIZE; c++)
        lines.push([
          r * SIZE + c,
          (r + 1) * SIZE + c - 1,
          (r + 2) * SIZE + c - 2,
        ]);
    for (const [a, b2, c] of lines) {
      if (b[a] === "S" && b[b2] === "O" && b[c] === "S") count++;
    }
    return count;
  }

  function handleCell(i: number) {
    if (board[i] !== "" || winner) return;
    const nb = [...board];
    nb[i] = letter;
    const prevTotal = countSOS(board);
    const newTotal = countSOS(nb);
    const scored = newTotal - prevTotal;
    let ns = { ...scores };
    if (scored > 0) ns[turn] += scored;
    setBoard(nb);
    setScores(ns);
    const filled = nb.every((c) => c !== "");
    if (filled) {
      if (ns.P1 > ns.P2) setWinner("Player 1 Wins!");
      else if (ns.P2 > ns.P1) setWinner("Player 2 Wins!");
      else setWinner("Draw!");
    } else {
      setTurn(scored > 0 ? turn : turn === "P1" ? "P2" : "P1");
    }
  }

  function reset() {
    setBoard(empty.slice());
    setTurn("P1");
    setLetter("S");
    setScores({ P1: 0, P2: 0 });
    setWinner(null);
  }

  return (
    <div className="p-4">
      <SubPageHeader title="SOS Game" onBack={onBack} />
      <div className="flex justify-between mb-3 text-sm text-gold/80">
        <span>P1: {scores.P1}</span>
        <span className="text-foreground/70">
          {winner || (turn === "P1" ? "Player 1's turn" : "Player 2's turn")}
        </span>
        <span>P2: {scores.P2}</span>
      </div>
      {!winner && (
        <div className="flex gap-2 justify-center mb-3">
          <Button
            size="sm"
            variant={letter === "S" ? "default" : "outline"}
            onClick={() => setLetter("S")}
            className="w-12"
          >
            S
          </Button>
          <Button
            size="sm"
            variant={letter === "O" ? "default" : "outline"}
            onClick={() => setLetter("O")}
            className="w-12"
          >
            O
          </Button>
        </div>
      )}
      <div
        className="grid gap-1 mx-auto"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          maxWidth: 260,
        }}
      >
        {board.map((cell, i) => (
          <button
            type="button"
            key={`sos-${i * 31 + 7}`}
            onClick={() => handleCell(i)}
            className="aspect-square rounded-lg border border-border/50 text-lg font-bold text-gold bg-card/50 hover:bg-gold/10 transition-colors flex items-center justify-center"
            style={{ height: 48 }}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <div className="text-center mt-4">
          <p className="text-xl font-bold text-gold mb-2">{winner}</p>
          <Button
            onClick={reset}
            className="bg-gold text-black hover:bg-gold/80"
          >
            Play Again
          </Button>
        </div>
      )}
      {!winner && (
        <div className="text-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="border-gold/30 text-gold/70"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

function TicTacToeGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<("X" | "O" | null)[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  function checkWinner(b: ("X" | "O" | null)[]) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b2, c] of lines)
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a];
    if (b.every(Boolean)) return "Draw";
    return null;
  }

  function handleCell(i: number) {
    if (board[i] || winner) return;
    const nb = [...board] as ("X" | "O" | null)[];
    nb[i] = xTurn ? "X" : "O";
    const w = checkWinner(nb);
    setBoard(nb);
    if (w) setWinner(w === "Draw" ? "Draw!" : `${w} Wins!`);
    else setXTurn(!xTurn);
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setWinner(null);
  }

  return (
    <div className="p-4">
      <SubPageHeader title="Tic-Tac-Toe" onBack={onBack} />
      <p className="text-center mb-3 text-gold/80 text-sm">
        {winner || (xTurn ? "X's turn" : "O's turn")}
      </p>
      <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 220 }}>
        {board.map((cell, i) => (
          <button
            type="button"
            key={`ttt-${i * 13 + 3}`}
            onClick={() => handleCell(i)}
            className="aspect-square rounded-xl border-2 border-gold/30 text-3xl font-bold flex items-center justify-center transition-all hover:bg-gold/10"
            style={{
              height: 68,
              color:
                cell === "X" ? "oklch(0.85 0.18 85)" : "oklch(0.7 0.18 280)",
            }}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <div className="text-center mt-4">
          <p className="text-xl font-bold text-gold mb-2">{winner}</p>
          <Button
            onClick={reset}
            className="bg-gold text-black hover:bg-gold/80"
          >
            Play Again
          </Button>
        </div>
      )}
      {!winner && (
        <div className="text-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="border-gold/30 text-gold/70"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🦊", "🐻", "🐼", "🐨"];

function MemoryGame({ onBack }: { onBack: () => void }) {
  const shuffle = () => {
    const arr = [...EMOJIS, ...EMOJIS].map((e, i) => ({
      id: i,
      emoji: e,
      flipped: false,
      matched: false,
    }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const [cards, setCards] = useState(shuffle);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

  function handleFlip(id: number) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched || selected.length === 2) return;
    const ns = [...selected, id];
    const nc = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    setCards(nc);
    setSelected(ns);
    if (ns.length === 2) {
      setMoves((m) => m + 1);
      const [a, b2] = ns.map((i) => nc.find((c) => c.id === i)!);
      if (a.emoji === b2.emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (ns.includes(c.id) ? { ...c, matched: true } : c)),
          );
          setMatches((m) => m + 1);
          setSelected([]);
        }, 400);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (ns.includes(c.id) ? { ...c, flipped: false } : c)),
          );
          setSelected([]);
        }, 800);
      }
    }
  }

  const won = matches === EMOJIS.length;

  return (
    <div className="p-4">
      <SubPageHeader title="Memory Match" onBack={onBack} />
      <p className="text-center text-sm text-gold/70 mb-3">
        Moves: {moves} | Matches: {matches}/{EMOJIS.length}
      </p>
      <div className="grid grid-cols-4 gap-2 mx-auto" style={{ maxWidth: 280 }}>
        {cards.map((card) => (
          <button
            type="button"
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 border ${card.flipped || card.matched ? "bg-gold/20 border-gold/50" : "bg-card/80 border-border/40 hover:bg-card"}`}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>
      {won && (
        <div className="text-center mt-4">
          <p className="text-xl font-bold text-gold mb-2">
            You Won! 🎉 ({moves} moves)
          </p>
          <Button
            onClick={() => {
              setCards(shuffle());
              setMoves(0);
              setMatches(0);
              setSelected([]);
            }}
            className="bg-gold text-black hover:bg-gold/80"
          >
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
}

function PuzzleGame({ onBack }: { onBack: () => void }) {
  const solved = [...Array(15).keys()].map((i) => i + 1).concat([0]);
  const shuffle = () => {
    let arr = [...solved];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const [tiles, setTiles] = useState(shuffle);
  const [moves, setMoves] = useState(0);

  function handleTile(i: number) {
    const empty = tiles.indexOf(0);
    const row = Math.floor(i / 4);
    const col = i % 4;
    const er = Math.floor(empty / 4);
    const ec = empty % 4;
    if (
      (Math.abs(row - er) === 1 && col === ec) ||
      (Math.abs(col - ec) === 1 && row === er)
    ) {
      const nt = [...tiles];
      [nt[i], nt[empty]] = [nt[empty], nt[i]];
      setTiles(nt);
      setMoves((m) => m + 1);
    }
  }

  const won = tiles.every((t, i) => t === solved[i]);

  return (
    <div className="p-4">
      <SubPageHeader title="Number Puzzle" onBack={onBack} />
      <p className="text-center text-sm text-gold/70 mb-3">
        Moves: {moves} {won ? "🎉 Solved!" : ""}
      </p>
      <div
        className="grid grid-cols-4 gap-1.5 mx-auto"
        style={{ maxWidth: 240 }}
      >
        {tiles.map((t, i) => (
          <button
            type="button"
            key={`tile-pos-${i + 1}`}
            onClick={() => handleTile(i)}
            className={`aspect-square rounded-lg text-lg font-bold flex items-center justify-center transition-all border ${t === 0 ? "bg-transparent border-transparent" : "bg-card/80 border-gold/30 hover:bg-gold/10 text-gold"}`}
          >
            {t !== 0 ? t : ""}
          </button>
        ))}
      </div>
      {won && (
        <div className="text-center mt-4">
          <p className="text-xl font-bold text-gold mb-2">
            Solved! 🎉 ({moves} moves)
          </p>
          <Button
            onClick={() => {
              setTiles(shuffle());
              setMoves(0);
            }}
            className="bg-gold text-black hover:bg-gold/80"
          >
            Play Again
          </Button>
        </div>
      )}
      {!won && (
        <div className="text-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTiles(shuffle());
              setMoves(0);
            }}
            className="border-gold/30 text-gold/70"
          >
            Shuffle
          </Button>
        </div>
      )}
    </div>
  );
}

function GamesScreen({ onBack }: { onBack: () => void }) {
  const [activeGame, setActiveGame] = useState<GameId>(null);

  if (activeGame === "sos")
    return <SOSGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "tictactoe")
    return <TicTacToeGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "memory")
    return <MemoryGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "puzzle")
    return <PuzzleGame onBack={() => setActiveGame(null)} />;

  const games = [
    {
      id: "sos" as GameId,
      emoji: "🔤",
      name: "SOS",
      desc: "Form SOS in a row!",
      color: "from-purple-500/20 to-purple-900/20 border-purple-500/30",
    },
    {
      id: "tictactoe" as GameId,
      emoji: "❌",
      name: "Tic-Tac-Toe",
      desc: "Classic X vs O",
      color: "from-blue-500/20 to-blue-900/20 border-blue-500/30",
    },
    {
      id: "memory" as GameId,
      emoji: "🃏",
      name: "Memory Match",
      desc: "Find the pairs!",
      color: "from-green-500/20 to-green-900/20 border-green-500/30",
    },
    {
      id: "puzzle" as GameId,
      emoji: "🔢",
      name: "Number Puzzle",
      desc: "Slide to sort 1-15",
      color: "from-orange-500/20 to-orange-900/20 border-orange-500/30",
    },
  ];

  return (
    <div className="p-4">
      <SubPageHeader title="Games" onBack={onBack} />
      <p className="text-center text-foreground/60 text-sm mb-6">
        Choose a game to play!
      </p>
      <div className="grid grid-cols-2 gap-4">
        {games.map((g) => (
          <button
            type="button"
            key={g.id}
            onClick={() => setActiveGame(g.id)}
            className={`rounded-2xl border bg-gradient-to-br p-5 flex flex-col items-center gap-2 hover:scale-105 transition-transform active:scale-95 ${g.color}`}
          >
            <span className="text-4xl">{g.emoji}</span>
            <span className="font-bold text-gold text-sm">{g.name}</span>
            <span className="text-foreground/60 text-xs text-center">
              {g.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizScreen({ user, onBack }: { user: UserData; onBack: () => void }) {
  const isAdmin = isLeader(user.firstName, user.lastName);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    question: "",
    a: "",
    b: "",
    c: "",
    d: "",
    correct: 0,
    marks: 1,
  });
  // Per-question attempt state: index -> chosen option index
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  const handleAdd = () => {
    if (!form.question.trim() || !form.a || !form.b || !form.c || !form.d) {
      toast.error("Fill in question and all 4 options");
      return;
    }
    const q: QuizQuestion = {
      id: Date.now(),
      question: form.question.trim(),
      options: [form.a, form.b, form.c, form.d],
      correctIndex: form.correct,
      marks: form.marks,
    };
    setQuestions((p) => [...p, q]);
    setForm({ question: "", a: "", b: "", c: "", d: "", correct: 0, marks: 1 });
    setAddOpen(false);
    toast.success("Question added!");
  };

  const handleDelete = (id: number) => {
    setQuestions((p) => p.filter((q) => q.id !== id));
    toast.success("Question removed");
  };

  const handleChoose = (qId: number, optIndex: number) => {
    if (submitted[qId]) return;
    setAttempts((p) => ({ ...p, [qId]: optIndex }));
  };

  const handleSubmit = (qId: number) => {
    if (attempts[qId] === undefined) {
      toast.error("Please select an option first");
      return;
    }
    setSubmitted((p) => ({ ...p, [qId]: true }));
    const q = questions.find((x) => x.id === qId);
    if (!q) return;
    if (attempts[qId] === q.correctIndex) {
      toast.success(`Correct! +${q.marks} mark${q.marks > 1 ? "s" : ""} 🎉`);
    } else {
      toast.error(
        `Wrong! Correct answer: ${String.fromCharCode(65 + q.correctIndex)}`,
      );
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <h1 className="font-display text-xl font-bold text-gold">Quiz Box</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAddOpen(true)}
                className="border border-gold/30 text-gold hover:bg-gold/10 rounded-xl text-xs h-9"
                data-ocid="quiz.open_modal_button"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
              data-ocid="quiz.back.button"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-display">
              No questions yet
            </p>
            {isAdmin && (
              <p className="text-muted-foreground text-sm mt-2">
                Tap "Add Question" to create the first quiz question
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, qi) => {
              const chosen = attempts[q.id];
              const isSubmitted = submitted[q.id];
              return (
                <motion.div
                  key={q.id}
                  className="card-celestial rounded-2xl p-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qi * 0.06 }}
                  data-ocid={`quiz.item.${qi + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <p className="font-display font-semibold text-foreground text-base leading-snug flex-1">
                      <span className="text-gold mr-2">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gold bg-gold/15 border border-gold/30 rounded-lg px-2 py-1 font-medium">
                        {q.marks} mark{q.marks > 1 ? "s" : ""}
                      </span>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(q.id)}
                          className="w-7 h-7 text-destructive hover:bg-destructive/10 rounded-lg"
                          data-ocid={`quiz.delete_button.${qi + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, oi) => {
                      let btnClass =
                        "w-full text-left rounded-xl px-4 py-2.5 text-sm border transition-all duration-150 flex items-center gap-3 ";
                      if (!isSubmitted) {
                        btnClass +=
                          chosen === oi
                            ? "bg-gold/25 border-gold text-foreground"
                            : "bg-secondary/20 border-border text-foreground hover:border-gold/50 hover:bg-gold/10";
                      } else {
                        if (oi === q.correctIndex) {
                          btnClass +=
                            "bg-green-500/20 border-green-500 text-green-300";
                        } else if (chosen === oi && oi !== q.correctIndex) {
                          btnClass +=
                            "bg-red-500/20 border-red-500 text-red-300";
                        } else {
                          btnClass +=
                            "bg-secondary/10 border-border/50 text-muted-foreground opacity-60";
                        }
                      }
                      return (
                        <button
                          key={`${q.id}-opt-${oi}`}
                          type="button"
                          className={btnClass}
                          onClick={() => handleChoose(q.id, oi)}
                          disabled={isSubmitted}
                          data-ocid={`quiz.item.${qi + 1}.radio.${oi + 1}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                            {optionLabels[oi]}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {!isSubmitted ? (
                    <Button
                      onClick={() => handleSubmit(q.id)}
                      className="w-full bg-gold text-deep-space hover:bg-accent rounded-xl h-10 font-display font-semibold"
                      data-ocid={`quiz.item.${qi + 1}.submit_button`}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <div
                      className={`text-center text-sm font-semibold py-2 rounded-xl ${
                        attempts[q.id] === q.correctIndex
                          ? "text-green-400 bg-green-500/10"
                          : "text-red-400 bg-red-500/10"
                      }`}
                    >
                      {attempts[q.id] === q.correctIndex
                        ? `Correct! +${q.marks} mark${q.marks > 1 ? "s" : ""}`
                        : `Wrong! Correct: ${optionLabels[q.correctIndex]}`}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Question Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="bg-card border-border text-foreground max-w-sm rounded-2xl"
          data-ocid="quiz.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-gold">
              Add Quiz Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-muted-foreground text-sm">Question</Label>
              <textarea
                value={form.question}
                onChange={(e) =>
                  setForm((p) => ({ ...p, question: e.target.value }))
                }
                placeholder="Enter your question..."
                rows={3}
                className="w-full mt-1 bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
                data-ocid="quiz.textarea"
              />
            </div>
            {(["a", "b", "c", "d"] as const).map((key, i) => (
              <div key={key}>
                <Label className="text-muted-foreground text-sm">
                  Option {optionLabels[i]}
                </Label>
                <Input
                  value={form[key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  placeholder={`Option ${optionLabels[i]}`}
                  className="bg-input border-border mt-1"
                  data-ocid={`quiz.option_${key}.input`}
                />
              </div>
            ))}
            <div>
              <Label className="text-muted-foreground text-sm">
                Correct Answer
              </Label>
              <select
                value={form.correct}
                onChange={(e) =>
                  setForm((p) => ({ ...p, correct: Number(e.target.value) }))
                }
                className="w-full mt-1 bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold"
                data-ocid="quiz.correct.select"
              >
                {optionLabels.map((l, i) => (
                  <option key={l} value={i}>
                    Option {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Marks</Label>
              <Input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    marks: Math.max(1, Number(e.target.value)),
                  }))
                }
                className="bg-input border-border mt-1"
                data-ocid="quiz.marks.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              data-ocid="quiz.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-gold text-deep-space hover:bg-accent"
              data-ocid="quiz.submit_button"
            >
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Notifications Screen ──────────────────────────────────────────────────────
function NotificationsScreen({
  notifications,
  onMarkAllRead,
  onDismissOne,
  onBack,
}: {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onDismissOne: (id: string) => void;
  onBack: () => void;
}) {
  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="relative min-h-screen celestial-bg overflow-y-auto">
      <StarsBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 celestial-bg py-4 border-b border-border">
          <h1 className="font-display text-xl font-bold text-gold">
            Notifications
          </h1>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onMarkAllRead}
                className="border border-gold/30 text-gold hover:bg-gold/10 rounded-xl text-xs h-9"
              >
                Clear all
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="rounded-xl border border-gold/30 text-gold hover:bg-gold/10 w-10 h-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-display">
              No notifications
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              New messages from all boxes will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  layout
                  className="card-celestial border border-gold/30 rounded-2xl px-4 py-3 flex items-start gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-gold text-xs font-semibold uppercase tracking-wide truncate">
                        {n.boxName}
                      </span>
                      <span className="text-muted-foreground text-xs flex-shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismissOne(n.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 mt-0.5"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "our-heaven-user";

function loadStoredUser(): UserData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserData;
    if (parsed.firstName && parsed.phone) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveUser(u: UserData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

function AppInner() {
  const { actor } = useActor();

  const [screen, setScreen] = useState<Screen>("splash");
  const [userData, setUserData] = useState<UserData>(() => {
    return (
      loadStoredUser() ?? {
        firstName: "",
        lastName: "",
        dob: "",
        phone: "",
        password: "",
      }
    );
  });
  const [unreadMessages, setUnreadMessages] = useState(0);
  const lastSeenCountRef = useRef(0);
  const hasViewedMessagesRef = useRef(false);
  const notifPermGranted = useRef(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const lastNotifMsgCountRef = useRef(0);
  const lastNotifImportantCountRef = useRef(0);

  // Register service worker + request notification permission after login
  useEffect(() => {
    if (!userData.firstName) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        notifPermGranted.current = perm === "granted";
      });
    } else if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      notifPermGranted.current = true;
    }
  }, [userData.firstName]);

  // Poll for new messages to show badge on Messages box
  useEffect(() => {
    if (!actor || screen !== "home") return;
    const checkMessages = async () => {
      try {
        const msgs = await actor.getAllMessages();
        const total = msgs.length;
        if (hasViewedMessagesRef.current) {
          // User already viewed — keep badge at 0, update baseline
          setUnreadMessages(0);
          lastSeenCountRef.current = total;
          hasViewedMessagesRef.current = false;
          return;
        }
        if (total > lastSeenCountRef.current) {
          const newCount = total - lastSeenCountRef.current;
          setUnreadMessages(newCount);
          // Fire browser/phone notification for new messages
          if (
            notifPermGranted.current &&
            "serviceWorker" in navigator &&
            document.hidden
          ) {
            const latest = msgs[msgs.length - 1];
            const preview = latest
              ? `${latest.sender}: ${String(latest.content).slice(0, 60)}`
              : "You have new messages";
            navigator.serviceWorker.ready
              .then((reg) => {
                reg.showNotification("Our Heaven — New Message", {
                  body: preview,
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: "new-message",
                  renotify: true,
                } as NotificationOptions);
              })
              .catch(() => {});
          }
        }
      } catch {
        // silent
      }
    };
    checkMessages();
    const interval = setInterval(checkMessages, 5000);
    return () => clearInterval(interval);
  }, [actor, screen]);

  // Poll for new notifications (messages + important messages)
  useEffect(() => {
    if (!actor) return;
    const checkNotifs = async () => {
      try {
        const msgs = await actor.getAllMessages();
        if (msgs.length > lastNotifMsgCountRef.current) {
          const newMsgs = msgs.slice(lastNotifMsgCountRef.current);
          const newNotifs: NotificationItem[] = newMsgs.map((m) => ({
            id: `msg-${String(m.timestamp)}-${m.sender}`,
            boxName: "Messages",
            message: `${m.sender}: ${m.content}`,
            timestamp: Number(m.timestamp) / 1_000_000,
            read: false,
          }));
          setNotifications((prev) => [...newNotifs, ...prev].slice(0, 100));
          lastNotifMsgCountRef.current = msgs.length;
        }
      } catch {
        // silent
      }
      try {
        const important = await actor.getAllImportantMessages();
        const active = important.filter((m) => !m.dismissed);
        if (active.length > lastNotifImportantCountRef.current) {
          const newItems = active.slice(lastNotifImportantCountRef.current);
          const newNotifs: NotificationItem[] = newItems.map((m) => ({
            id: `imp-${String(m.id)}`,
            boxName: "Important Messages",
            message: `${m.author}: ${m.content}`,
            timestamp: Date.now(),
            read: false,
          }));
          setNotifications((prev) => [...newNotifs, ...prev].slice(0, 100));
          lastNotifImportantCountRef.current = active.length;
        }
      } catch {
        // silent
      }
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 6000);
    return () => clearInterval(interval);
  }, [actor]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const markAllNotifsRead = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissOneNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateUser = useCallback((u: UserData) => {
    setUserData(u);
    saveUser(u);
  }, []);

  const navigate = useCallback(
    (s: Screen) => {
      // When navigating to any chat/message screen, clear the unread badge
      // and also mark all notifications as read so the red dot disappears
      const chatScreens: Screen[] = [
        "messages",
        "group-chat",
        "your-ideas",
        "notifications",
      ];
      if (chatScreens.includes(s)) {
        markAllNotifsRead();
      }
      if (s === "messages") {
        setUnreadMessages(0);
        hasViewedMessagesRef.current = true;
        lastSeenCountRef.current = Number.MAX_SAFE_INTEGER;
        lastNotifMsgCountRef.current = Number.MAX_SAFE_INTEGER;
        if (actor) {
          actor
            .getAllMessages()
            .then((msgs) => {
              lastSeenCountRef.current = msgs.length;
              lastNotifMsgCountRef.current = msgs.length;
              hasViewedMessagesRef.current = false;
            })
            .catch(() => {
              hasViewedMessagesRef.current = false;
            });
        }
      }
      setScreen(s);
    },
    [actor, markAllNotifsRead],
  );

  return (
    <ActorContext.Provider value={actor}>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Toaster richColors position="top-center" />
        <MusicPlayer />

        <AnimatePresence mode="wait">
          {screen === "splash" && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SplashScreen
                onComplete={() => {
                  const stored = loadStoredUser();
                  navigate(stored ? "home" : "welcome");
                }}
              />
            </motion.div>
          )}

          {screen === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WelcomeScreen onCreateAccount={() => navigate("register")} />
            </motion.div>
          )}

          {screen === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
            >
              <RegistrationForm
                onNext={(data) => {
                  updateUser(data);
                  navigate("account-ready");
                }}
              />
            </motion.div>
          )}

          {screen === "account-ready" && (
            <motion.div
              key="account-ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AccountReadyScreen
                firstName={userData.firstName}
                onComplete={() => navigate("home")}
              />
            </motion.div>
          )}

          {screen === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HomeScreen
                user={userData}
                onNavigate={navigate}
                onUpdateUser={updateUser}
                unreadCount={unreadMessages}
                notificationCount={unreadNotifCount}
              />
            </motion.div>
          )}

          {screen === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <MessagesScreen user={userData} onBack={() => navigate("home")} />
            </motion.div>
          )}

          {screen === "stars" && (
            <motion.div
              key="stars"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <StarsScreen onBack={() => navigate("home")} />
            </motion.div>
          )}

          {screen === "birthdays" && (
            <motion.div
              key="birthdays"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <BirthdaysScreen onBack={() => navigate("home")} />
            </motion.div>
          )}

          {screen === "meet" && (
            <motion.div
              key="meet"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <MeetScreen onBack={() => navigate("home")} />
            </motion.div>
          )}

          {screen === "important-messages" && (
            <motion.div
              key="important-messages"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <ImportantMessagesScreen
                user={userData}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "your-ideas" && (
            <motion.div
              key="your-ideas"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <YourIdeasScreen
                user={userData}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "photos" && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <PhotosScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "whatsapp" && (
            <motion.div
              key="whatsapp"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <WhatsAppScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "youtube" && (
            <motion.div
              key="youtube"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <YouTubeScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <CalendarScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "school-works" && (
            <motion.div
              key="school-works"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <SchoolWorksScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "rules" && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <RulesScreen user={userData} onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "quiz" && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <QuizScreen user={userData} onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "games" && (
            <motion.div
              key="games"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <GamesScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "attendance" && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <AttendanceScreen
                user={userData}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "prayer" && (
            <motion.div
              key="prayer"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <PrayerScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "indian-songs" && (
            <motion.div
              key="indian-songs"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <IndianSongsScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "calling" && (
            <motion.div
              key="calling"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <CallingScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "group-chat" && (
            <motion.div
              key="group-chat"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <GroupChatScreen
                user={userData}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "home-works" && (
            <motion.div
              key="home-works"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <HomeWorksScreen
                user={userData}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <NotificationsScreen
                notifications={notifications}
                onMarkAllRead={markAllNotifsRead}
                onDismissOne={dismissOneNotif}
                onBack={() => navigate("home")}
              />
            </motion.div>
          )}
          {screen === "all-persons" && (
            <motion.div
              key="all-persons"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <AllPersonsScreen onBack={() => navigate("home")} />
            </motion.div>
          )}
          {screen === "messaging-hub" && (
            <motion.div
              key="messaging-hub"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <MessagingHubScreen
                user={userData}
                onBack={() => navigate("home")}
                unreadMessages={unreadMessages}
                notificationCount={unreadNotifCount}
                notifications={notifications}
                onMarkAllRead={markAllNotifsRead}
                onDismissOne={dismissOneNotif}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ActorContext.Provider>
  );
}

export default function App() {
  return <AppInner />;
}
