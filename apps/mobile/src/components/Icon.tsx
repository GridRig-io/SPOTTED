import {
  ArrowUpDown, BadgeCheck, BatteryCharging, Bath, Bed, Briefcase, Calendar, Car, Cctv, Check, ChevronDown, ChevronLeft, ChevronRight,
  CigaretteOff, CircleHelp, Clock, Copy, DoorClosed, Droplets, Fan, Flame, Heart, House, Info, KeyRound, Lock, LogOut, Luggage, MapPin,
  Menu, MessageCircle, Microwave, Minus, PartyPopper, PawPrint, Plus, Refrigerator, Search, ShieldCheck, SlidersHorizontal, Snowflake,
  Star, ThermometerSun, TriangleAlert, Tv, User, Users, Utensils, WashingMachine, Wifi, X, Zap, Image as ImageIcon, Share2, Navigation, LocateFixed, Map as MapIcon, Upload, Trash2, Pencil, Eye, CalendarX, LayoutDashboard, CircleCheck, Circle, Clock3, Ban, ExternalLink, Phone, Landmark, Hourglass,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "@/theme";

// Identical names to the website's registry, so an icon key from the database draws the same icon everywhere.
export const ICONS: Record<string, LucideIcon> = {
  "arrow-up-down": ArrowUpDown, "badge-check": BadgeCheck, "battery-charging": BatteryCharging, bath: Bath, bed: Bed, briefcase: Briefcase,
  calendar: Calendar, car: Car, cctv: Cctv, check: Check, "chevron-down": ChevronDown, "chevron-left": ChevronLeft, "chevron-right": ChevronRight,
  "cigarette-off": CigaretteOff, "circle-help": CircleHelp, clock: Clock, copy: Copy, "door-closed": DoorClosed, droplets: Droplets, fan: Fan,
  flame: Flame, heart: Heart, house: House, info: Info, "key-round": KeyRound, lock: Lock, "log-out": LogOut, luggage: Luggage, "map-pin": MapPin,
  menu: Menu, "message-circle": MessageCircle, microwave: Microwave, minus: Minus, "party-popper": PartyPopper, "paw-print": PawPrint, plus: Plus,
  refrigerator: Refrigerator, search: Search, "shield-check": ShieldCheck, "sliders-horizontal": SlidersHorizontal, snowflake: Snowflake, star: Star,
  "thermometer-sun": ThermometerSun, "triangle-alert": TriangleAlert, tv: Tv, user: User, users: Users, utensils: Utensils,
  "washing-machine": WashingMachine, wifi: Wifi, x: X, zap: Zap, image: ImageIcon,
  share: Share2, navigation: Navigation, "locate-fixed": LocateFixed, map: MapIcon, upload: Upload, "trash-2": Trash2, pencil: Pencil, eye: Eye,
  "calendar-x": CalendarX, "layout-dashboard": LayoutDashboard, "circle-check": CircleCheck, circle: Circle, "clock-3": Clock3, ban: Ban,
  "external-link": ExternalLink, phone: Phone, landmark: Landmark, hourglass: Hourglass,
};

export function Icon({ name, size = 20, color = colors.ink, strokeWidth = 2, fill = "none" }: { name: string; size?: number; color?: string; strokeWidth?: number; fill?: string }) {
  const C = ICONS[name] ?? Info;
  return <C size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
}
