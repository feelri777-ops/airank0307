import TrophySvg        from '../../assets/icons/trophy.svg?react';
import RankingSvg       from '../../assets/icons/ranking.svg?react';
import ImagesSvg        from '../../assets/icons/images.svg?react';
import ImageSvg         from '../../assets/icons/image.svg?react';
import ImageSquareSvg   from '../../assets/icons/image-square.svg?react';
import ChatCircleSvg    from '../../assets/icons/chat-circle.svg?react';
import FolderOpenSvg    from '../../assets/icons/folder-open.svg?react';
import NewspaperSvg     from '../../assets/icons/newspaper.svg?react';
import SparkleSvg       from '../../assets/icons/sparkle.svg?react';
import MagnifyingGlassSvg from '../../assets/icons/magnifying-glass.svg?react';
import UserCircleSvg    from '../../assets/icons/user-circle.svg?react';
import UsersSvg         from '../../assets/icons/users.svg?react';
import GearSvg          from '../../assets/icons/gear.svg?react';
import HouseSvg         from '../../assets/icons/house.svg?react';
import BookmarkSvg      from '../../assets/icons/bookmark.svg?react';
import BookmarksSvg     from '../../assets/icons/bookmarks.svg?react';
import HeartSvg         from '../../assets/icons/heart.svg?react';
import StarSvg          from '../../assets/icons/star.svg?react';
import FireSvg          from '../../assets/icons/fire.svg?react';
import PencilSvg        from '../../assets/icons/pencil.svg?react';
import PencilSimpleSvg  from '../../assets/icons/pencil-simple.svg?react';
import TrashSvg         from '../../assets/icons/trash.svg?react';
import PlusSvg          from '../../assets/icons/plus.svg?react';
import PlusCircleSvg    from '../../assets/icons/plus-circle.svg?react';
import XCircleSvg       from '../../assets/icons/x-circle.svg?react';
import CheckSvg         from '../../assets/icons/check.svg?react';
import CheckCircleSvg   from '../../assets/icons/check-circle.svg?react';
import EyeSvg           from '../../assets/icons/eye.svg?react';
import EyeSlashSvg      from '../../assets/icons/eye-slash.svg?react';
import LinkSvg          from '../../assets/icons/link.svg?react';
import TagSvg           from '../../assets/icons/tag.svg?react';
import GlobeSvg         from '../../assets/icons/globe.svg?react';
import RobotSvg         from '../../assets/icons/robot.svg?react';
import WrenchSvg        from '../../assets/icons/wrench.svg?react';
import BrainSvg         from '../../assets/icons/brain.svg?react';
import LightningSvg     from '../../assets/icons/lightning.svg?react';
import BellSvg          from '../../assets/icons/bell.svg?react';
import MedalSvg         from '../../assets/icons/medal.svg?react';
import CrownSvg         from '../../assets/icons/crown.svg?react';
import ChartBarSvg      from '../../assets/icons/chart-bar.svg?react';
import ListSvg          from '../../assets/icons/list.svg?react';
import ListBulletsSvg   from '../../assets/icons/list-bullets.svg?react';
import SortAscendingSvg from '../../assets/icons/sort-ascending.svg?react';
import SortDescendingSvg from '../../assets/icons/sort-descending.svg?react';
import SealCheckSvg     from '../../assets/icons/seal-check.svg?react';
import CertificateSvg   from '../../assets/icons/certificate.svg?react';
import LayoutSvg        from '../../assets/icons/layout.svg?react';
import RowsSvg          from '../../assets/icons/rows.svg?react';
import ColumnsSvg       from '../../assets/icons/columns.svg?react';
import ArrowUpSvg       from '../../assets/icons/arrow-up.svg?react';
import ArrowDownSvg     from '../../assets/icons/arrow-down.svg?react';
import CaretUpSvg       from '../../assets/icons/caret-up.svg?react';
import CaretDownSvg     from '../../assets/icons/caret-down.svg?react';

const ICONS = {
  trophy:           TrophySvg,
  ranking:          RankingSvg,
  images:           ImagesSvg,
  image:            ImageSvg,
  'image-square':   ImageSquareSvg,
  'chat-circle':    ChatCircleSvg,
  'folder-open':    FolderOpenSvg,
  newspaper:        NewspaperSvg,
  sparkle:          SparkleSvg,
  'magnifying-glass': MagnifyingGlassSvg,
  'user-circle':    UserCircleSvg,
  users:            UsersSvg,
  gear:             GearSvg,
  house:            HouseSvg,
  bookmark:         BookmarkSvg,
  bookmarks:        BookmarksSvg,
  heart:            HeartSvg,
  star:             StarSvg,
  fire:             FireSvg,
  pencil:           PencilSvg,
  'pencil-simple':  PencilSimpleSvg,
  trash:            TrashSvg,
  plus:             PlusSvg,
  'plus-circle':    PlusCircleSvg,
  'x-circle':       XCircleSvg,
  check:            CheckSvg,
  'check-circle':   CheckCircleSvg,
  eye:              EyeSvg,
  'eye-slash':      EyeSlashSvg,
  link:             LinkSvg,
  tag:              TagSvg,
  globe:            GlobeSvg,
  robot:            RobotSvg,
  wrench:           WrenchSvg,
  brain:            BrainSvg,
  lightning:        LightningSvg,
  bell:             BellSvg,
  medal:            MedalSvg,
  crown:            CrownSvg,
  'chart-bar':      ChartBarSvg,
  list:             ListSvg,
  'list-bullets':   ListBulletsSvg,
  'sort-ascending': SortAscendingSvg,
  'sort-descending': SortDescendingSvg,
  'seal-check':     SealCheckSvg,
  certificate:      CertificateSvg,
  layout:           LayoutSvg,
  rows:             RowsSvg,
  columns:          ColumnsSvg,
  'arrow-up':       ArrowUpSvg,
  'arrow-down':     ArrowDownSvg,
  'caret-up':       CaretUpSvg,
  'caret-down':     CaretDownSvg,
};

export default function Icon({ name, size = 20, color = 'currentColor', style, className }) {
  const Comp = ICONS[name];
  if (!Comp) return null;
  return (
    <Comp
      width={size}
      height={size}
      fill={color}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      className={className}
    />
  );
}
