export default function Logo({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="BinderBuddy" style={{ height: size, width: "auto" }} />
  );
}
