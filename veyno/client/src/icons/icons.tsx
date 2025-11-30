//client/src/icons/icons.tsx
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;       // px or "1em"
  strokeWidth?: number;         // line thickness (only for stroke icons)
  title?: string;               // to a11y
};

const base = ({
  size = 24,
  className,
  title,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

/* ======= Basic system icons ====== */

export const MenuIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <path d="M3 6h18" />
        <path d="M3 12h18" />
        <path d="M3 18h18" />
      </g>
    ),
  });

export const SearchIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </g>
    ),
  });

export const UserIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-3 4.5-5 8-5s6.5 2 8 5" />
      </g>
    ),
  });

export const HeartIcon = ({
  size = 24,
  strokeWidth = 2,
  filled = false,
  className,
  ...rest
}: IconProps & { filled?: boolean }) =>
  base({
    size,
    className,
    ...rest,
    children: (
      <path
        d="M12 19.8c-4.2-3.4-7-6.2-7-9.6C5 7.1 7.1 5 9.5 5c1.6 0 3.1.9 3.7 2.3C13.4 5.9 14.9 5 16.5 5 18.9 5 21 7.1 21 10.2c0 3.4-2.8 6.2-7 9.6l-2 0z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    ),
  });

export const CartIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <path d="M3 4h2l2.6 10.3a2 2 0 0 0 2 1.7h6.8a2 2 0 0 0 1.9-1.5L21 8H7.2" />
        <circle cx="10" cy="19" r="1.5" fill="currentColor" />
        <circle cx="17" cy="19" r="1.5" fill="currentColor" />
      </g>
    ),
  });

export const HomeIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </g>
    ),
  });

export const SendIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={props.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </g>
    ),
  });

export const StarIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <path
        d="M12 17.3l-5.3 3 1.4-6.1-4.6-4 6.2-.6L12 4l2.3 5.6 6.2.6-4.6 4 1.4 6.1-5.3-3Z"
        fill="currentColor"
      />
    ),
  });

export const TruckIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <rect x="2" y="7" width="11" height="8" rx="1" />
        <path d="M13 10h4l3 3v2h-2" />
        <circle cx="7" cy="18" r="1.5" fill="currentColor" />
        <circle cx="17" cy="18" r="1.5" fill="currentColor" />
      </g>
    ),
  });

export const ShieldIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <path
        d="M12 3l7 3v5c0 5-3.5 8.7-7 10-3.5-1.3-7-5-7-10V6l7-3Z"
        fill="currentColor"
      />
    ),
  });

// Minimize (horizontal line)
export const MinIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <path d="M5 12h14" />
      </g>
    ),
  });

// Close (X)
export const CloseIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 2} strokeLinecap="round">
        <path d="M6 6l12 12" />
        <path d="M18 6l-12 12" />
      </g>
    ),
  });

/* ======= Visibility (password) icons ====== */
export const EyeIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g
        stroke="currentColor"
        strokeWidth={props.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    ),
  });

export const EyeOffIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g
        stroke="currentColor"
        strokeWidth={props.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M3 3l18 18" />
      </g>
    ),
  });

export const AiChatIcon = (props: IconProps) =>
  base({
    ...props,
    children: (
      <g
        stroke="currentColor"
        strokeWidth={props.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Chat bubble outline + small triangle foot */}
        <path d="M4 6h16v9H9l-5 5V6z" />
        {/* Little star/spark in the corner */}
        <path d="M15 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
      </g>
    ),
  });

/* ====== Social Media Icons ====== */

export const FacebookIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"          // <- 32x32 for path
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M30.11 0H1.76C.786 0 0 .787 0 1.76v28.35c0 .97.787 1.758 1.76 1.758H17.02v-12.34H12.87v-4.81h4.152V11.17c0-4.116 2.514-6.357 6.185-6.357 1.76 0 3.27.13 3.712.19v4.3l-2.548.002c-1.997 0-2.384.95-2.384 2.342v3.07h4.763l-.62 4.81H21.99v12.34h8.12c.972 0 1.76-.787 1.76-1.758V1.76c0-.973-.788-1.76-1.76-1.76"
      stroke="currentColor"
      strokeWidth="0"
      fill="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const InstagramIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"          // <- 32x32 for path
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16 2.887c4.27 0 4.777.016 6.463.093 1.56.071 2.407.332 2.97.551.747.29 1.28.637 1.84 1.196.56.56.906 1.093 1.196 1.84.219.563.48 1.41.55 2.97.078 1.686.094 2.192.094 6.463 0 4.27-.016 4.777-.093 6.463-.071 1.56-.332 2.407-.551 2.97a4.955 4.955 0 0 1-1.196 1.84c-.56.56-1.093.906-1.84 1.196-.563.219-1.41.48-2.97.55-1.686.078-2.192.094-6.463.094s-4.777-.016-6.463-.093c-1.56-.071-2.407-.332-2.97-.551a4.955 4.955 0 0 1-1.84-1.196 4.955 4.955 0 0 1-1.196-1.84c-.219-.563-.48-1.41-.55-2.97-.078-1.686-.094-2.192-.094-6.463 0-4.27.016-4.777.093-6.463.071-1.56.332-2.407.551-2.97.29-.747.637-1.28 1.196-1.84a4.956 4.956 0 0 1 1.84-1.196c.563-.219 1.41-.48 2.97-.55 1.686-.078 2.192-.094 6.463-.094m0-2.882c-4.344 0-4.889.018-6.595.096C7.703.18 6.54.45 5.523.845A7.84 7.84 0 0 0 2.69 2.69 7.84 7.84 0 0 0 .845 5.523C.449 6.54.179 7.703.1 9.405.023 11.111.005 11.656.005 16c0 4.344.018 4.889.096 6.595.078 1.702.348 2.865.744 3.882A7.84 7.84 0 0 0 2.69 29.31a7.84 7.84 0 0 0 2.833 1.845c1.017.396 2.18.666 3.882.744 1.706.078 2.251.096 6.595.096 4.344 0 4.889-.018 6.595-.096 1.702-.078 2.865-.348 3.882-.744a7.84 7.84 0 0 0 2.833-1.845 7.84 7.84 0 0 0 1.845-2.833c.396-1.017.666-2.18.744-3.882.078-1.706.096-2.251.096-6.595 0-4.344-.018-4.889-.096-6.595-.078-1.702-.348-2.865-.744-3.882A7.84 7.84 0 0 0 29.31 2.69 7.84 7.84 0 0 0 26.477.845C25.46.449 24.297.179 22.595.1 20.889.023 20.344.005 16 .005 M16 7.786a8.214 8.214 0 1 0 0 16.428 8.214 8.214 0 0 0 0-16.428zm0 13.546a5.332 5.332 0 1 1 0-10.664 5.332 5.332 0 0 1 0 10.664zM26.458 7.462a1.92 1.92 0 1 1-3.84 0 1.92 1.92 0 0 1 3.84 0"
      stroke="currentColor"
      strokeWidth="0"
      fill="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TikTokIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"          // <- 32x32 for path
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16.9089 0H22.7968C22.7968 0 22.4609 7.02125 30.9569 7.5359V12.9581C30.9569 12.9581 26.4126 13.2154 22.7968 10.6422L22.8561 21.8541C22.8561 23.8616 22.2159 25.8239 21.0166 27.4928C19.8173 29.1617 18.1128 30.4621 16.1188 31.2294C14.1247 31.9968 11.9308 32.1967 9.81457 31.8037C7.69837 31.4107 5.75506 30.4426 4.23055 29.0218C2.70604 27.6011 1.66885 25.7915 1.25026 23.8222C0.831662 21.8529 1.05047 19.8123 1.87899 17.9587C2.7075 16.1051 4.10849 14.5218 5.90465 13.4092C7.70082 12.2965 9.81142 11.7046 11.9694 11.7082H13.4907V17.2774C12.4981 16.9913 11.4337 17.0037 10.449 17.3128C9.46437 17.622 8.60962 18.2122 8.0064 18.9994C7.40319 19.7867 7.08226 20.7308 7.08926 21.6976C7.09626 22.6643 7.43085 23.6044 8.04542 24.3839C8.65998 25.1635 9.52321 25.743 10.5123 26.0398C11.5013 26.3366 12.5658 26.3356 13.5542 26.037C14.5426 25.7385 15.4046 25.1575 16.0176 24.3768C16.6305 23.5961 16.9632 22.6554 16.9682 21.6887L16.9089 0Z"
      stroke="currentColor"
      strokeWidth="0"
      fill="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);


export const YouTubeIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"          // <- 32x32 for path
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M31.7 9s-.3-2.4-1.3-3.3c-1.2-1.3-2.6-1.3-3.2-1.4C22.7 4 16 4 16 4s-6.7 0-11.2.3c-.6 0-2 0-3.2 1.4C.6 6.7.3 9 .3 9S0 11.3 0 14v2.5c0 2.5.3 5 .3 5S.6 24 1.6 25c1.2 1 2.8 1 3.4 1.2 2.7.2 11 .3 11 .3s6.7 0 11.2-.3c.6 0 2 0 3.2-1.4 1-1 1.3-3.2 1.3-3.2s.3-2.6.3-5V14c0-2.6-.3-5-.3-5zm-19 10.4v-9l8.6 4.5-8.6 4.2z" 
      stroke="currentColor"
      strokeWidth="0"
      fill="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ======== Flags for currencyselecter ===========
export const FlagUS = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 640 480" width="16" height="12" {...props} aria-hidden="true">
    <path fill="#b22234" d="M0 0h640v480H0z" />
    <path stroke="#fff" strokeWidth="40" d="M0 55h640M0 135h640M0 215h640M0 295h640M0 375h640M0 455h640" />
    <path fill="#3c3b6e" d="M0 0h280v210H0z" />
    <g fill="#fff">
      {Array.from({ length: 35 }).map((_, i) => {
        const r = Math.floor(i / 7), c = i % 7;
        const x = 20 + c * 40 + (r % 2 ? 20 : 0);
        const y = 20 + r * 30;
        return <circle key={i} cx={x} cy={y} r={4} />;
      })}
    </g>
  </svg>
);

export const FlagEU = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 60 40" width="16" height="12" {...props} aria-hidden="true">
    <rect width="60" height="40" fill="#003399" />
    <g fill="#ffcc00" transform="translate(30,20)">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <circle key={i} cx={Math.cos(a) * 12} cy={Math.sin(a) * 12} r={1.6} />;
      })}
    </g>
  </svg>
);

export const FlagHU = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 3 2" width="16" height="12" {...props} aria-hidden="true">
    <rect width="3" height="2" fill="#ffffff" />
    <rect width="3" height="0.6667" y="0" fill="#ce2939" />
    <rect width="3" height="0.6667" y="1.3333" fill="#477050" />
  </svg>
);

/* ====== Ikon registry ====== */

const registry = {
  //service
  menu: MenuIcon,
  search: SearchIcon,
  user: UserIcon,
  eye: EyeIcon,
  eyeoff: EyeOffIcon,
  heart: HeartIcon,
  cart: CartIcon,
  home: HomeIcon,
  star: StarIcon,
  truck: TruckIcon,
  shield: ShieldIcon,
  chat: AiChatIcon,
  send: SendIcon,
  close: CloseIcon,
  min: MinIcon,

  //social media
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  
  //flags
  eu: FlagEU,
  us: FlagUS,
  hu: FlagHU,
};

export type IconName = keyof typeof registry;

export function Icon({ name, ...rest }: IconProps & { name: IconName }) {
  const Cmp = registry[name];
  return <Cmp {...rest} />;
}
