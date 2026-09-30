/* ============================================================
   QuoteFlow — icon set (inline SVG, currentColor, no dependency)
   ============================================================ */

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

function Svg({ children, size = 18, ...rest }) {
  return (
    <svg {...base} {...rest} width={size} height={size}>
      {children}
    </svg>
  )
}

export const IconDashboard = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="8.5" rx="1.8" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
  </Svg>
)

export const IconQuotes = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h3" />
  </Svg>
)

export const IconBookings = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M8.5 14.5h2" />
    <path d="M13.5 14.5h2" />
  </Svg>
)

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M7.5 14h3v3h-3z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconCustomers = (p) => (
  <Svg {...p}>
    <path d="M16 20v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.2V20" />
    <circle cx="9.5" cy="7.5" r="3.4" />
    <path d="M21 20v-1.8a3.6 3.6 0 0 0-2.7-3.5" />
    <path d="M15.5 4.2a3.6 3.6 0 0 1 0 6.6" />
  </Svg>
)

export const IconSettings = (p) => (
  <Svg {...p}>
    <path d="M4 7h9" />
    <path d="M17 7h3" />
    <path d="M4 17h3" />
    <path d="M11 17h9" />
    <circle cx="15" cy="7" r="2.3" />
    <circle cx="9" cy="17" r="2.3" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
)

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
)

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const IconChevronLeft = (p) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
)

export const IconArrowUpRight = (p) => (
  <Svg {...p}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </Svg>
)

export const IconMore = (p) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M3 13h4l1.6 2.6h6.8L17 13h4" />
    <path d="M5.4 5.6 3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-2.4-7.4A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.9 1.6" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
)

export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" />
  </Svg>
)

export const IconXCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9.2 9.2 5.6 5.6" />
    <path d="m14.8 9.2-5.6 5.6" />
  </Svg>
)

export const IconWallet = (p) => (
  <Svg {...p}>
    <path d="M20 8.5V7a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19H18a2 2 0 0 0 2-2v-1.5" />
    <path d="M21 10.5h-4.2a2.2 2.2 0 0 0 0 4.4H21a1 1 0 0 0 1-1v-2.4a1 1 0 0 0-1-1" />
  </Svg>
)

export const IconTrendUp = (p) => (
  <Svg {...p}>
    <path d="m3 16.5 5.5-5.5 3.5 3.5L21 5" />
    <path d="M15.5 5H21v5.5" />
  </Svg>
)

export const IconTrendDown = (p) => (
  <Svg {...p}>
    <path d="m3 7.5 5.5 5.5 3.5-3.5L21 19" />
    <path d="M15.5 19H21v-5.5" />
  </Svg>
)

export const IconLogOut = (p) => (
  <Svg {...p}>
    <path d="M9.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5" />
    <path d="M15.5 16 20 12l-4.5-4" />
    <path d="M20 12H9.5" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
)

export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.8 7 7.1 5.2a2 2 0 0 0 2.2 0L20.2 7" />
  </Svg>
)

export const IconPhone = (p) => (
  <Svg {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5" />
  </Svg>
)

export const IconMapPin = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-5.4 7-10.4A7 7 0 0 0 5 10.6C5 15.6 12 21 12 21" />
    <circle cx="12" cy="10.4" r="2.6" />
  </Svg>
)

export const IconList = (p) => (
  <Svg {...p}>
    <path d="M8.5 6.5h12" />
    <path d="M8.5 12h12" />
    <path d="M8.5 17.5h12" />
    <circle cx="4" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
  </Svg>
)

export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6V19l-3.8 2v-7.9z" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconEdit = (p) => (
  <Svg {...p}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m14.5 5.5 4 4" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15" />
    <path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
    <path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
  </Svg>
)

export const IconSend = (p) => (
  <Svg {...p}>
    <path d="M20.5 3.5 3.8 10.2a.6.6 0 0 0 0 1.1l6.9 2.8 2.8 6.9a.6.6 0 0 0 1.1 0z" />
    <path d="m20.5 3.5-9.8 10.6" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Svg>
)

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
  </Svg>
)

export const IconBuilding = (p) => (
  <Svg {...p}>
    <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H14a1.5 1.5 0 0 1 1.5 1.5V20" />
    <path d="M15.5 10H19a1 1 0 0 1 1 1v9" />
    <path d="M3 20h18" />
    <path d="M7.5 9h4.5" />
    <path d="M7.5 12.5h4.5" />
    <path d="M10 20v-3.5h1.5V20" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9z" />
    <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Svg>
)

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 3.5v11" />
    <path d="m7.5 10 4.5 4.5 4.5-4.5" />
    <path d="M4 19.5h16" />
  </Svg>
)

export const IconFlag = (p) => (
  <Svg {...p}>
    <path d="M5 21V4.5" />
    <path d="M5 5.2h11.5l-2 3.6 2 3.6H5z" />
  </Svg>
)

export const IconSliders = IconSettings

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.2a4 4 0 0 1 8 0V10" />
  </Svg>
)
