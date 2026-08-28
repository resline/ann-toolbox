/**
 * Ikony używane w aplikacji.
 *
 * Importujemy je pojedynczo, bo barrel `lucide-react` zaczyna się od
 * `import * as index from './icons/index.js'` i re-eksportuje tę przestrzeń
 * nazw — Rollup nie potrafi wtedy odrzucić niczego i do wysyłki trafia komplet
 * ~1500 ikon. Przy 42 faktycznie używanych to była największa pojedyncza
 * pozycja w bundlu.
 *
 * Nowa ikona: dopisz linię tutaj, nigdy nie importuj wprost z 'lucide-react'.
 * Pilnuje tego src/lib/icons.test.ts.
 */

export type { LucideIcon } from 'lucide-react';

export { default as ArrowRight } from 'lucide-react/icons/arrow-right';
export { default as Bell } from 'lucide-react/icons/bell';
export { default as Check } from 'lucide-react/icons/check';
export { default as CheckCircle2 } from 'lucide-react/icons/circle-check';
export { default as ChevronDown } from 'lucide-react/icons/chevron-down';
export { default as ChevronRight } from 'lucide-react/icons/chevron-right';
export { default as ChevronUp } from 'lucide-react/icons/chevron-up';
export { default as Circle } from 'lucide-react/icons/circle';
export { default as CircleDot } from 'lucide-react/icons/circle-dot';
export { default as Clock } from 'lucide-react/icons/clock';
export { default as CloudRain } from 'lucide-react/icons/cloud-rain';
export { default as Download } from 'lucide-react/icons/download';
export { default as Edit2 } from 'lucide-react/icons/pen';
export { default as Filter } from 'lucide-react/icons/filter';
export { default as FolderHeart } from 'lucide-react/icons/folder-heart';
export { default as Footprints } from 'lucide-react/icons/footprints';
export { default as House } from 'lucide-react/icons/house';
export { default as LayoutList } from 'lucide-react/icons/layout-list';
export { default as ListTodo } from 'lucide-react/icons/list-todo';
export { default as Loader2 } from 'lucide-react/icons/loader-circle';
export { default as MoreVertical } from 'lucide-react/icons/more-vertical';
export { default as Music } from 'lucide-react/icons/music';
export { default as PartyPopper } from 'lucide-react/icons/party-popper';
export { default as Pause } from 'lucide-react/icons/pause';
export { default as Play } from 'lucide-react/icons/play';
export { default as Plus } from 'lucide-react/icons/plus';
export { default as RefreshCcw } from 'lucide-react/icons/refresh-ccw';
export { default as RefreshCw } from 'lucide-react/icons/refresh-cw';
export { default as RotateCcw } from 'lucide-react/icons/rotate-ccw';
export { default as Save } from 'lucide-react/icons/save';
export { default as Settings } from 'lucide-react/icons/settings';
export { default as Settings2 } from 'lucide-react/icons/settings-2';
export { default as SlidersHorizontal } from 'lucide-react/icons/sliders-horizontal';
export { default as Sparkles } from 'lucide-react/icons/sparkles';
export { default as Square } from 'lucide-react/icons/square';
export { default as Star } from 'lucide-react/icons/star';
export { default as Tag } from 'lucide-react/icons/tag';
export { default as Trash2 } from 'lucide-react/icons/trash-2';
export { default as TreePine } from 'lucide-react/icons/tree-pine';
export { default as Trophy } from 'lucide-react/icons/trophy';
export { default as Volume2 } from 'lucide-react/icons/volume-2';
export { default as VolumeX } from 'lucide-react/icons/volume-x';
export { default as Waves } from 'lucide-react/icons/waves';
export { default as X } from 'lucide-react/icons/x';
