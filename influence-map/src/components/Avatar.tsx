// A person's photo, or their initials when there is none (org chart and Pull lists).

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

export default function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return photoUrl ? (
    <img className="org-photo" src={photoUrl} alt="" loading="lazy" />
  ) : (
    <span className="org-photo org-initials" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
